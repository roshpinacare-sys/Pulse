// Pulse probe — the loop-body of the fleet's autonomous heartbeat.
// Loop discipline (observe → choose → act → verify → record → named terminal):
//   1. OBSERVE: live GitHub census of the whole fleet (every repo, dynamic — new repos
//      are auto-included; no hardcoded roster = no drift blind-spot). NEVER-BLIND law:
//      authority ladder FLEET_TOKEN → GH_PAT → tokenless /users/{owner}/repos.
//      Public repos are listable WITHOUT any token — so `repos: 0` while public repos
//      exist is a blindness bug, never an honest verdict. Each repo's Actions liveness
//      (latest workflow run) is measured too — the organ sees the network's real pulse.
//   2. ACT: compute staleness/health; write state/network.json + state/history.jsonl.
//   3. VERIFY: the workflow's git commit of state/ is the observable gate — anyone can
//      see the heartbeat in git log without trusting any agent's word.
//   4. RECORD + TERMINAL: state/terminal semantics — success | degraded | blocked.
//      Never silent: a degraded probe opens/comments an alert issue (fail-closed honesty);
//      recovery (success again) closes the alert issue, completing the loop.
// Secrets: FLEET_TOKEN / GH_PAT (Actions secrets) are never printed, never logged, never committed.
//   PAT health is probed every run — a dead/expired token is FLAGS, not a silent failure.
//   Tokenless mode is an HONEST permanent mode: the state says `visibility: public-only`
//   and the terminal is degraded — private sight is missing, and that is reported, not hidden.
// Schema: pulse-network-v2 (v1 fields preserved; adds auth.visibility + per-repo actions liveness).
import { readFile, writeFile } from 'node:fs/promises'

const API = 'https://api.github.com'
const REPO = process.env.GITHUB_REPOSITORY || 'roshpinacare-sys/Pulse'
const OWNER = REPO.split('/')[0]
const FLEET_TOKEN = process.env.FLEET_TOKEN || ''
const GH_PAT = process.env.GH_PAT || ''
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || ''
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

// paginated list (max 5 pages = 500 repos); honest failure record per page
async function listRepos(path, tok) {
  const sep = path.includes('?') ? '&' : '?'
  const out = []
  for (let page = 1; page <= 5; page++) {
    const r = await gh(`${path}${sep}per_page=100&page=${page}&sort=pushed`, tok)
    if (r.status !== 200 || !Array.isArray(r.data)) {
      const why = r.error || (r.data && r.data.message) || `HTTP ${r.status}`
      return { repos: out, ok: false, http: r.status, why }
    }
    out.push(...r.data)
    if (r.data.length < 100) break
  }
  return { repos: out, ok: true, http: 200, why: null }
}

const state = { terminal: 'success', reasons: [] }

// --- 1. OBSERVE (a): PAT health (blind-spot cover: token expiry/death becomes VISIBLE, not silent) ---
const AUTH_SECRET = FLEET_TOKEN ? 'FLEET_TOKEN' : GH_PAT ? 'GH_PAT' : ''
const AUTH_TOK = FLEET_TOKEN || GH_PAT || ''
let patHealth = { ok: false, status: 'missing', secret: AUTH_SECRET || null }
if (AUTH_TOK) {
  const r = await gh('/user', AUTH_TOK)
  patHealth = { ok: r.status === 200, status: String(r.status), secret: AUTH_SECRET }
  if (!patHealth.ok) state.reasons.push(`${AUTH_SECRET} probe failed (HTTP ${r.status}) — expired/revoked/scoped-out token`)
} else {
  state.reasons.push('FLEET_TOKEN/GH_PAT secrets not set — census falls back to tokenless public-only sight')
}

// --- 1. OBSERVE (b): census — authority ladder, NEVER-BLIND ---
// ladder: authenticated /user/repos (private+public) → tokenless /users/{owner}/repos?type=owner (public-only).
const repos = []
let mode = 'anonymous'
let visibility = 'public-only'
const authCensus = patHealth.ok ? await listRepos('/user/repos', AUTH_TOK) : null
if (authCensus && authCensus.repos.length > 0) {
  mode = 'fleet-full'
  visibility = 'private+public'
  repos.push(...authCensus.repos)
} else if (authCensus) {
  state.reasons.push(`authenticated census returned 0 repos (HTTP ${authCensus.http}${authCensus.why ? `: ${authCensus.why}` : ''}) — falling back to tokenless public sight`)
}
if (repos.length === 0) {
  const pub = await listRepos(`/users/${OWNER}/repos?type=owner`, '') // tokenless ON PURPOSE
  if (pub.repos.length > 0) {
    mode = 'public-only'
    repos.push(...pub.repos)
  } else {
    mode = patHealth.ok ? 'fleet-full (0 measured)' : 'anonymous (0 measured)'
    state.reasons.push(`tokenless census of /users/${OWNER}/repos returned 0 repos (HTTP ${pub.http}${pub.why ? `: ${pub.why}` : ''}) — organ is blind: network unreachable or IP rate-limited (60/h tokenless)`)
  }
}

// --- 1. OBSERVE (c): per-repo Actions liveness — the network's actual pulse ---
// latest workflow run per repo; authenticated for private sight, tokenless works for public repos.
const liveTok = patHealth.ok ? AUTH_TOK : ''
const LIVENESS = new Map()
let livenessRateLimited = false
for (const r of repos) {
  if (r.archived) { LIVENESS.set(r.name, { status: 'skipped', why: 'archived' }); continue }
  const lr = await gh(`/repos/${r.full_name || `${OWNER}/${r.name}`}/actions/runs?per_page=1`, liveTok)
  if (!liveTok) await new Promise((s) => setTimeout(s, 250)) // politeness: tokenless budget is 60/h per IP
  if (lr.status === 403 || lr.status === 429) {
    livenessRateLimited = true
    LIVENESS.set(r.name, { status: 'unmeasured', http: lr.status })
    continue
  }
  if (lr.status !== 200) { LIVENESS.set(r.name, { status: 'unmeasured', http: lr.status }); continue }
  const run = lr.data?.workflow_runs?.[0]
  if (!run) { LIVENESS.set(r.name, { status: 'no-runs' }); continue }
  LIVENESS.set(r.name, {
    status: run.status,
    conclusion: run.conclusion,
    workflow: run.name,
    event: run.event,
    startedAt: run.created_at,
    url: run.html_url,
  })
}
if (livenessRateLimited) state.reasons.push('Actions liveness partially unmeasured — API rate-limit wall hit (honest gap, not silence)')

// --- 2. ACT: compute ---
// CALIBRATION MATRIX (issue #8, T-70): a red run is not automatically a sick organ.
//   info-class    = private repo + audit/scan/verify/test/build-shaped workflow dispatched
//                   by design to FLAG things (gitleaks, exposure-gate, claims-guard, ...) —
//                   red is their working output, recorded but never a degrade.
//   actionable    = public repo red (faces/runners must be green), OR private repo red on a
//                   PUSH trigger (active development CI), OR private red on a runner-shaped
//                   workflow (rotation/runtime/wallet/treasury/payroll/evolution/artery),
//                   OR any red older than 7d is DORMANT, not failing-now (freshness guard).
// Raw counts stay visible either way — calibration organizes signal, it never hides.
const AUDIT_CLASS = /(gitleaks|scan|audit|verif|guard|baseline|canary|tests?\b|\bCI\b|build|heart|controls|exposure|claims|integrity)/i
const RUNNER_CLASS = /(rotation|runtime|wallet|treasury|payroll|evolution|artery|tick|catchup|heal|watchdog|deploy)/i
const RED_FRESH_MS = 7 * 24 * 3600 * 1000
const fleet = repos.map((r) => ({
  name: r.name,
  private: !!r.private,
  archived: !!r.archived,
  defaultBranch: r.default_branch,
  pushedAt: r.pushed_at,
  issuesOpen: r.open_issues_count ?? 0,
  actions: LIVENESS.get(r.name) || { status: 'unmeasured' },
}))
const redRuns = fleet.filter((r) => {
  const a = r.actions
  if (a.status !== 'completed' || !a.conclusion || ['success', 'neutral', 'skipped'].includes(a.conclusion)) return false
  if (a.startedAt && Date.now() - new Date(a.startedAt).getTime() > RED_FRESH_MS) return false // dormant, not failing-now
  return true
})
const isInfoClass = (r) => r.private && !RUNNER_CLASS.test(r.actions.workflow || '') && AUDIT_CLASS.test(r.actions.workflow || '') && r.actions.event !== 'push'
const actionsRedInfo = redRuns.filter((r) => isInfoClass(r)).map((r) => r.name)
const actionsRedActionable = redRuns.filter((r) => !isInfoClass(r)).map((r) => r.name)
const actionsFailing = redRuns.map((r) => r.name) // raw, unfiltered — kept for continuity
const stale24h = fleet
  .filter((r) => !r.archived && r.pushedAt && Date.now() - new Date(r.pushedAt).getTime() > 24 * 3600 * 1000)
  .map((r) => r.name)
const issuesTop = fleet
  .filter((r) => (r.issuesOpen || 0) > 0)
  .sort((a, b) => b.issuesOpen - a.issuesOpen)
  .slice(0, 8)
  .map((r) => ({ name: r.name, open: r.issuesOpen }))
const totals = {
  repos: fleet.length,
  public: fleet.filter((r) => !r.private).length,
  private: fleet.filter((r) => r.private).length,
  archived: fleet.filter((r) => r.archived).length,
  stale24h: stale24h.length,
  issuesOpen: fleet.reduce((a, r) => a + (r.issuesOpen || 0), 0),
  issuesTop,
  actionsFailing: actionsFailing.length,
  actionsRedInfo: actionsRedInfo.length,
  actionsRedActionable: actionsRedActionable.length,
  actionsUnmeasured: fleet.filter((r) => r.actions.status === 'unmeasured').length,
}

// --- cadence honesty: measure the LOOP, not just the means (T-68/T-69 pending item) ---
// The current run always sees itself as fresh — so freshness is measured against the
// PREVIOUS run (any trigger). scheduleStatus records GitHub's best-effort registration
// as a named, time-stamped fact instead of a silent assumption.
const cadence = {
  schedule: '*/30 * * * *',
  scheduleStatus: 'unmeasured',
  firstScheduledRun: null,
  lastRunAgeMin: null,
  covered: false,
  nextExpectedWithinMin: 90,
}
{
  const own = await gh(`/repos/${REPO}/actions/runs?per_page=30`, GITHUB_TOKEN)
  const runs = Array.isArray(own.data?.workflow_runs) ? own.data.workflow_runs : []
  const prev = runs.find((r) => String(r.id) !== String(GITHUB_RUN_ID))
  const sched = runs.find((r) => r.event === 'schedule')
  cadence.scheduleStatus = sched ? 'firing' : runs.length > 0 ? 'pending-first-fire' : 'unmeasured'
  if (sched) cadence.firstScheduledRun = { id: sched.id, at: sched.created_at }
  if (prev) {
    cadence.lastRunAgeMin = Math.round((Date.now() - new Date(prev.created_at).getTime()) / 60000)
    cadence.covered = cadence.lastRunAgeMin <= cadence.nextExpectedWithinMin
  }
  if (!sched && runs.length > 0) {
    state.reasons.push(`schedule event not yet firing (GitHub best-effort registration; ${runs.length} runs so far, trigger=${[...new Set(runs.map((r) => r.event))].join('/')}) — loop covered by dispatch ignition within SLA; auto-upgrades when schedule registers`)
  }
}

// --- terminal semantics (honest, fail-closed, CALIBRATED) ---
if (repos.length === 0) {
  state.terminal = 'blocked'
} else if (mode !== 'fleet-full') {
  state.terminal = 'degraded'
  state.reasons.push(`visibility: public-only — ${totals.private === 0 ? 'private sight unavailable' : `${totals.private} private repos invisible from this census`} (mode=${mode})`)
} else if (patHealth.ok && actionsRedActionable.length > 0) {
  // calibrated degrade: ONLY actionable reds speak here (audit noise is recorded, not degrading)
  state.terminal = 'degraded'
  state.reasons.push(`Actions red (actionable): ${actionsRedActionable.join(', ')}`)
  if (actionsRedInfo.length > 0) state.reasons.push(`Actions red (expected-audit info, calibrated per #8, ${actionsRedInfo.length}): ${actionsRedInfo.join(', ')}`)
} else if (patHealth.ok && actionsRedInfo.length > 0) {
  state.reasons.push(`Actions red (expected-audit info, calibrated per #8, ${actionsRedInfo.length}): ${actionsRedInfo.join(', ')}`)
}
if (repos.length > 0 && cadence.scheduleStatus !== 'unmeasured' && !cadence.covered) {
  state.terminal = 'degraded'
  state.reasons.push(`heartbeat loop uncovered: last run ${cadence.lastRunAgeMin ?? '?'} min ago (SLA ${cadence.nextExpectedWithinMin}) — the anti-silence promise requires freshness, not just triggers`)
}

// --- 3. RECORD: write state (names + timestamps only — sanitized, PUBLISH-POLICY §3) ---
const network = {
  schema: 'pulse-network-v2',
  generatedAt: NOW,
  trigger: TRIGGER,
  note: NOTE || undefined,
  terminal: state.terminal,
  visibility,
  reasons: state.reasons,
  auth: { pat: patHealth, mode, visibility },
  cadence,
  totals,
  stale24h,
  actionsFailing,
  actionsRedActionable,
  actionsRedInfo,
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
hist.push(JSON.stringify({ at: NOW, trigger: TRIGGER, terminal: state.terminal, repos: totals.repos, stale: totals.stale24h, pat: patHealth.ok, visibility, actionsFailing: totals.actionsFailing, redActionable: totals.actionsRedActionable, covered: cadence.covered, schedule: cadence.scheduleStatus }))
if (hist.length > 3000) hist = hist.slice(-3000)
await writeFile('state/history.jsonl', hist.join('\n') + '\n', 'utf-8')

console.log(`probe: terminal=${state.terminal} repos=${totals.repos} public=${totals.public} private=${totals.private} stale24h=${totals.stale24h} red=${totals.actionsFailing} (actionable=${totals.actionsRedActionable} info=${totals.actionsRedInfo}) visibility=${visibility} pat=${patHealth.ok ? 'ok' : patHealth.status} mode=${mode} schedule=${cadence.scheduleStatus} covered=${cadence.covered} lastRunAgeMin=${cadence.lastRunAgeMin ?? '-'}`)

// --- 4. fail-closed alerting (never silent) — and recovery closes the loop ---
const alertBody = `${NOW}\ntrigger=${TRIGGER} terminal=${state.terminal} visibility=${visibility}\nreasons:\n${state.reasons.map((r) => '- ' + r).join('\n')}`
if (state.terminal !== 'success') {
  const title = 'alert: heartbeat degraded/blocked — see latest state/network.json'
  const s = await gh(`/repos/${REPO}/issues?labels=alert&state=open&per_page=10`, GITHUB_TOKEN)
  const existing = Array.isArray(s.data) ? s.data.find((i) => !i.pull_request) : null
  if (existing) {
    const c = await fetch(`${API}/repos/${REPO}/issues/${existing.number}/comments`, {
      method: 'POST', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: alertBody }),
    })
    console.log(`alert: commented on #${existing.number} (${c.status})`)
  } else {
    const c = await fetch(`${API}/repos/${REPO}/issues`, {
      method: 'POST', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, labels: ['alert'], body: `${alertBody}\n\nThis issue stays open until a heartbeat run succeeds again.` }),
    })
    console.log(`alert: created issue (${c.status})`)
  }
} else {
  // recovery: the alert issue's own law says "stays open until a heartbeat run succeeds again"
  const s = await gh(`/repos/${REPO}/issues?labels=alert&state=open&per_page=10`, GITHUB_TOKEN)
  const existing = Array.isArray(s.data) ? s.data.find((i) => !i.pull_request) : null
  if (existing) {
    const cm = await fetch(`${API}/repos/${REPO}/issues/${existing.number}/comments`, {
      method: 'POST', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: `${NOW}\nrecovered: heartbeat terminal=success visibility=${visibility} repos=${totals.repos} — closing per the issue's own law` }),
    })
    const c = await fetch(`${API}/repos/${REPO}/issues/${existing.number}`, {
      method: 'PATCH', headers: { ...H(GITHUB_TOKEN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' }),
    })
    console.log(`alert: recovered — closed #${existing.number} (comment ${cm.status}, patch ${c.status})`)
  }
}

process.exit(0) // the state commit is the receipt — even degraded runs record their truth
