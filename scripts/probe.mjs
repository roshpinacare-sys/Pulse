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
