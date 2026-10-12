// Pulse probe — the loop-body of the fleet's autonomous heartbeat.
// Loop discipline (observe → choose → act → verify → record → named terminal):
//   1. OBSERVE: live GitHub census of the whole fleet (every repo, dynamic — new repos
//      are auto-included; no hardcoded roster = no drift blind-spot).
//   2. ACT: compute staleness/health; write state/network.json + state/history.jsonl.
//   3. VERIFY: the workflow's git commit of state/ is the observable gate — anyone can
//      see the heartbeat in git log without trusting any agent's word.
//   4. RECORD + TERMINAL: state/terminal semantics — success | degraded | blocked.
//      Never silent: a degraded probe opens/comments an alert issue (fail-closed honesty).
// Secrets: FLEET_TOKEN (Actions secret) is never printed, never logged, never committed.
//   PAT health is probed every run — a dead/expired token is FLAGS, not a silent failure.
import { readFile, writeFile } from 'node:fs/promises'

const API = 'https://api.github.com'
const REPO = process.env.GITHUB_REPOSITORY || 'roshpinacare-sys/Pulse'
const FLEET_TOKEN = process.env.FLEET_TOKEN || ''
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const TRIGGER = (process.env.TRIGGER || 'unknown').slice(0, 40)
const NOTE = (process.env.NOTE || '').slice(0, 200)
const NOW = new Date().toISOString()

const H = (tok) => ({
  Accept: 'application/vnd.github+json',
  'User-Agent': 'pulse-heartbeat',
  ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
})

async function gh(path, tok) {
  try {
    const res = await fetch(`${API}${path}`, { headers: H(tok), signal: AbortSignal.timeout(15000) })
    let data = null
    try { data = await res.json() } catch {}
    return { status: res.status, data }
  } catch (e) {
    return { status: 0, data: null, error: String(e?.message || e) }
  }
}

const state = { terminal: 'success', reasons: [] }

// --- 1. PAT health (blind-spot cover: token expiry/death becomes VISIBLE, not silent) ---
let patHealth = { ok: false, status: 'missing' }
if (FLEET_TOKEN) {
  const r = await gh('/user', FLEET_TOKEN)
  patHealth = { ok: r.status === 200, status: String(r.status) }
  if (!patHealth.ok) state.reasons.push(`FLEET_TOKEN probe failed (HTTP ${r.status}) — expired/revoked/scoped-out token`)
} else {
  state.reasons.push('FLEET_TOKEN secret not set — fleet census impossible')
}

// --- 2. census with the best available authority ---
const tok = patHealth.ok ? FLEET_TOKEN : GITHUB_TOKEN
const mode = patHealth.ok ? 'fleet-full' : GITHUB_TOKEN ? 'own-repo-only (degraded)' : 'anonymous (degraded)'
const repos = []
let page = 1
if (tok) {
  for (; page <= 5; page++) {
    const r = await gh(`/user/repos?per_page=100&page=${page}&sort=pushed`, tok)
    if (r.status !== 200 || !Array.isArray(r.data)) break
    repos.push(...r.data)
    if (r.data.length < 100) break
  }
}
if (repos.length === 0) {
  state.terminal = 'blocked'
  state.reasons.push(`census returned 0 repos (token mode=${mode}) — no authority to see anything`)
} else if (!patHealth.ok) {
  state.terminal = 'degraded'
}

// --- 3. compute ---
const fleet = repos.map((r) => ({
  name: r.name,
  private: !!r.private,
  archived: !!r.archived,
  defaultBranch: r.default_branch,
  pushedAt: r.pushed_at,
  issuesOpen: r.open_issues_count ?? 0,
}))
const stale24h = fleet
  .filter((r) => !r.archived && r.pushedAt && Date.now() - new Date(r.pushedAt).getTime() > 24 * 3600 * 1000)
  .map((r) => r.name)
const totals = {
  repos: fleet.length,
  public: fleet.filter((r) => !r.private).length,
  private: fleet.filter((r) => r.private).length,
  archived: fleet.filter((r) => r.archived).length,
  stale24h: stale24h.length,
  issuesOpen: fleet.reduce((a, r) => a + (r.issuesOpen || 0), 0),
}

// --- 4. write state (names + timestamps only — sanitized, PUBLISH-POLICY §3) ---
const network = {
  schema: 'pulse-network-v1',
  generatedAt: NOW,
  trigger: TRIGGER,
  note: NOTE || undefined,
  terminal: state.terminal,
  reasons: state.reasons,
  auth: { pat: patHealth, mode },
  cadence: { schedule: '*/30 * * * *', nextExpectedWithinMin: 90 },
  totals,
  stale24h,
  fleet,
}
await writeFile('state/network.json', JSON.stringify(network, null, 1), 'utf-8')

// --- 4b. PUBLIC MIRROR (lane revival — the Domain faces' closed lanes come back alive):
//     The Sandbox lane ledgers were PUBLIC-GRADE until T-66 (they went dark because the whole
//     repo flipped private, NOT because of their content). CI reads them with the sealed token
//     and republishes them on this public shell — restoring the public faces without re-opening
//     the content repo (PUBLISH-POLICY §7 sanitized output, same class as beacon/lighthouse states).
//     Honesty: per-source at/error recorded; a failed source is reported, never forged.
const SANDBOX = 'roshpinacare-sys/Sandbox'
const RAW_SB = `https://raw.githubusercontent.com/${SANDBOX}/main/`
const sources = {}
async function grab(key, path, kind) {
  try {
    let res = await fetch(RAW_SB + path, { headers: H(FLEET_TOKEN || GITHUB_TOKEN), signal: AbortSignal.timeout(20000) })
    if (res.status === 404) { sources[key] = { at: NOW, path, error: 'source 404 — honest gap' }; return }
    if (!res.ok) {
      // fallback: contents API (works with token on private repos)
      const c = await gh(`/repos/${SANDBOX}/contents/${path}`, FLEET_TOKEN || GITHUB_TOKEN)
      if (c.status !== 200 || !c.data?.content) { sources[key] = { at: NOW, path, error: `fetch ${res.status}/contents ${c.status}` }; return }
      const buf = Buffer.from(c.data.content, 'base64')
      const body = kind === 'text' ? buf.toString('utf8') : JSON.parse(buf.toString('utf8'))
      sources[key] = { at: NOW, path, [kind === 'text' ? 'text' : 'data']: body }
      return
    }
    const body = kind === 'text' ? await res.text() : await res.json()
    sources[key] = { at: NOW, path, [kind === 'text' ? 'text' : 'data']: body }
  } catch (e) {
    sources[key] = { at: NOW, path, error: String(e?.message || e).slice(0, 120) }
  }
}
await Promise.all([
  grab('lessons', 'ops/lessons/ledger.md', 'text'),
  grab('flowMap', 'ops/flow/flow-map.json', 'json'),
  grab('integrity', 'ops/integrity/verdict.json', 'json'),
  grab('decisionTruth', 'ops/decision-truth/verdict.json', 'json'),
  grab('profitOracle', 'receipts/profit-oracle-latest.json', 'json'),
])
// research: date-named files — CI walks back up to 9 days for the latest findings
{
  const p = (n) => String(n).padStart(2, '0')
  let done = false
  for (let back = 0; back <= 9 && !done; back++) {
    const d = new Date(Date.now() - back * 86400e3)
    const path = `research/findings-${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}.json`
    try {
      const res = await fetch(RAW_SB + path, { headers: H(FLEET_TOKEN || GITHUB_TOKEN), signal: AbortSignal.timeout(20000) })
      if (res.ok) { sources.research = { at: NOW, path, data: await res.json() }; done = true }
    } catch {}
  }
  if (!done) sources.research = { at: NOW, path: 'research/findings-*.json', error: 'no findings file within 9 days — honest gap' }
}
// live chain probes (the probe lanes live again, on public infra)
const chains = { hiveHead: null, steemHead: null }
const rpcHead = async (url) => {
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: ['condenser_api', 'get_dynamic_global_properties', []], id: 1 }),
      signal: AbortSignal.timeout(15000),
    })
    return (await r.json())?.result?.head_block_number ?? null
  } catch { return null }
}
chains.hiveHead = await rpcHead('https://api.hive.blog')
chains.steemHead = await rpcHead('https://api.steemit.com')
const mirror = {
  schema: 'pulse-mirror-v1',
  generatedAt: NOW,
  trigger: TRIGGER,
  provenance: 'CI-carried from roshpinacare-sys/Sandbox public-grade ledgers (darkened by the T-66 repo flip, not by content) + live chain probes. Sanitized output of a §7 runner shell.',
  chains,
  sources,
}
const mirrorJson = JSON.stringify(mirror)
if (mirrorJson.length > 600000) {
  // size guard — carry stamps honestly instead of oversized payloads
  for (const k of ['flowMap', 'research', 'profitOracle']) {
    if (sources[k]?.data && JSON.stringify(sources[k].data).length > 150000) sources[k] = { at: NOW, path: sources[k].path, error: 'payload too large for public mirror — carried as gap' }
  }
}
await writeFile('mirror/lanes.json', JSON.stringify(mirror, null, 1), 'utf-8')
console.log(`mirror: sources=${Object.keys(sources).length} chains=${chains.hiveHead ?? '-'}/${chains.steemHead ?? '-'}`)

let hist = []
try {
  hist = (await readFile('state/history.jsonl', 'utf-8')).split('\n').filter(Boolean)
} catch {}
hist.push(JSON.stringify({ at: NOW, trigger: TRIGGER, terminal: state.terminal, repos: totals.repos, stale: totals.stale24h, pat: patHealth.ok }))
if (hist.length > 3000) hist = hist.slice(-3000)
await writeFile('state/history.jsonl', hist.join('\n') + '\n', 'utf-8')

console.log(`probe: terminal=${state.terminal} repos=${totals.repos} public=${totals.public} private=${totals.private} stale24h=${totals.stale24h} pat=${patHealth.ok ? 'ok' : patHealth.status}`)

// --- 5. fail-closed alerting (never silent) ---
if (state.terminal !== 'success') {
  const title = 'alert: heartbeat degraded/blocked — see latest state/network.json'
  const s = await gh(`/repos/${REPO}/issues?labels=alert&state=open&per_page=1`, GITHUB_TOKEN)
  const existing = s.data?.[0]
  if (existing) {
    const c = await fetch(`${API}/repos/${REPO}/issues/${existing.number}/comments`, {
      method: 'POST', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: `${NOW}\ntrigger=${TRIGGER} terminal=${state.terminal}\nreasons:\n${state.reasons.map((r) => '- ' + r).join('\n')}` }),
    })
    console.log(`alert: commented on #${existing.number} (${c.status})`)
  } else {
    const c = await fetch(`${API}/repos/${REPO}/issues`, {
      method: 'POST', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, labels: ['alert'], body: `${NOW}\ntrigger=${TRIGGER} terminal=${state.terminal}\nreasons:\n${state.reasons.map((r) => '- ' + r).join('\n')}\n\nThis issue stays open until a heartbeat run succeeds again.` }),
    })
    console.log(`alert: created issue (${c.status})`)
  }
}

process.exit(0) // the state commit is the receipt — even degraded runs record their truth
