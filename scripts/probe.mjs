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
// Secrets: FLEET_TOKEN / GH_PAT / FLEET_ROSTER_MAP (Actions secrets) are never printed, never logged, never committed.
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

// ── refs layer (3-c identity law) ─────────────────────────────────────────────
// The mirror carries VERBATIM copies of private-repo artifacts (Sandbox research
// findings, lessons ledgers). Those artifacts may quote estate account names —
// measured leak: the RC-starved experiment landed 13 real names in
// mirror/lanes.json. Law now: EVERY string the mirror publishes passes the refs
// scrub below — estate names -> acct-NN refs (map = FLEET_ROSTER_MAP secret,
// env-only; absent map = no-op with an honest stdout note, never a fabricated
// mapping, never a committed name->ref table).
const ROSTER_NAME_TO_REF = (() => {
  try {
    const env = process.env.FLEET_ROSTER_MAP || ''
    if (!env.trim().startsWith('{')) return new Map()
    const j = JSON.parse(env)
    const m = new Map()
    const ingest = (ref, name) => {
      if (typeof ref === 'string' && /^acct-\d\d$/.test(ref) && typeof name === 'string' && name) m.set(name, ref)
    }
    if (j && typeof j.refs === 'object') for (const [r, n] of Object.entries(j.refs)) ingest(r, n)
    if (j && typeof j.names === 'object') for (const [n, r] of Object.entries(j.names)) ingest(r, n)
    if (j && typeof j === 'object') for (const [k, v] of Object.entries(j)) {
      if (typeof k === 'string' && typeof v === 'string') (k.startsWith('acct-') ? ingest(k, v) : ingest(v, k))
    }
    return m
  } catch { return new Map() }
})()
if (!ROSTER_NAME_TO_REF.size) console.log('[refs] roster-unresolved: FLEET_ROSTER_MAP absent/unmapped — mirror scrub is a NO-OP this run (names must never be relied on upstream)')
const scrubText = (t) => {
  let out = String(t)
  for (const [n, r] of ROSTER_NAME_TO_REF) {
    out = out.replace(new RegExp('(?<![A-Za-z0-9])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z0-9])', 'gi'), r)
  }
  return out
}
const scrubVal = (v) => {
  if (typeof v === 'string') return scrubText(v)
  if (Array.isArray(v)) return v.map(scrubVal)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [scrubText(k), scrubVal(x)]))
  return v
}

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
    runId: run.id,
    startedAt: run.created_at,
    url: run.html_url,
  })
}
if (livenessRateLimited) state.reasons.push('Actions liveness partially unmeasured — API rate-limit wall hit (honest gap, not silence)')

// --- 1. OBSERVE (d): last-commit freshness (R326) — pushed_at lies ---
// Measured 2026-10-14T02:26:18-33Z: a bulk branch/tag event bumped pushed_at on 7
// dormant repos within ONE minute, so the stale24h meter flashed false-fresh and
// the dormant census (issue #5) silently fell out of the alarm. The honest clock
// is the last COMMIT on the default branch. Rate wall → per-repo fallback to
// pushed_at, recorded as a named honest gap (never silence).
let lastCommitRateLimited = 0
for (const r of repos) {
  if (r.archived) continue
  const cr = await gh(`/repos/${r.full_name || `${OWNER}/${r.name}`}/commits?per_page=1&sha=${encodeURIComponent(r.default_branch || 'main')}`, AUTH_TOK)
  if (cr.status === 403 || cr.status === 429) { lastCommitRateLimited++; r.lastCommitAt = null; continue }
  const c = Array.isArray(cr.data) ? cr.data[0] : null
  r.lastCommitAt = c?.commit?.committer?.date || c?.commit?.author?.date || null
}
if (lastCommitRateLimited > 0) state.reasons.push(`last-commit freshness unmeasured on ${lastCommitRateLimited} repos (API rate wall) — those fall back to pushed_at (honest gap, not silence)`)

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
  lastCommitAt: r.lastCommitAt || null,
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
// --- QUOTA-SIGNATURE (T-73): root-cause dedup, measured 2026-10-12 ---
// A private-repo job that FAILS with ZERO executed steps within seconds is not a code
// failure — it is the Actions-minutes billing gate (measured: saos-dex gate + wallet-verify
// failed 2s after start with steps=[] while public organs ran unlimited). N scary reds
// collapse into ONE named owner-gated condition; the code-level reds keep their own list.
const quotaGated = []
for (const name of actionsRedActionable) {
  const repo = fleet.find((r) => r.name === name)
  const runId = (LIVENESS.get(name) || {}).runId
  if (!repo || !repo.private || !runId) continue
  const jr = await gh(`/repos/${OWNER}/${name}/actions/runs/${runId}/jobs`, AUTH_TOK)
  const job = Array.isArray(jr.data?.jobs) ? jr.data.jobs.find((j) => j.conclusion === 'failure') : null
  if (!job) continue
  const stepsRun = (job.steps || []).filter((s) => s.status === 'completed' || s.status === 'in_progress').length
  const seconds = job.started_at && job.completed_at ? (new Date(job.completed_at) - new Date(job.started_at)) / 1000 : null
  if (stepsRun === 0 && seconds !== null && seconds < 15) quotaGated.push(name)
}
const actionsRedCode = actionsRedActionable.filter((n) => !quotaGated.includes(n))
const actionsFailing = redRuns.map((r) => r.name) // raw, unfiltered — kept for continuity
// R326: the staleness clock is the last commit on the default branch (lastCommitAt),
// falling back to pushed_at only where the rate wall blocked measurement. Stale
// entries get the dormant-decision ledger (issue #5) attached: a documented verdict
// is a PLANNED state, never a silenced one — verdict + reason + reviewBy ride INTO
// the published state (stale24hAnnotated), and an expired verdict re-enlists the
// repo as undecided (the re-review alarm). No ledger file = every repo undecided.
let dormantLedger = null
try { dormantLedger = JSON.parse(await readFile('state/dormant-decisions.json', 'utf-8')) } catch { /* no ledger yet = honest undecided */ }
const dormantMap = dormantLedger?.repos ? new Map(dormantLedger.repos.map((x) => [x.repo, x])) : new Map()
const stale24h = fleet
  .filter((r) => !r.archived && (r.lastCommitAt || r.pushedAt) && Date.now() - new Date(r.lastCommitAt || r.pushedAt).getTime() > 24 * 3600 * 1000)
  .map((r) => r.name)
const stale24hAnnotated = stale24h.map((name) => {
  const src = fleet.find((r) => r.name === name) || {}
  const v = dormantMap.get(name)
  const expired = !!(v?.reviewBy && new Date(v.reviewBy).getTime() < Date.now())
  return {
    name,
    lastCommitAt: src.lastCommitAt || null,
    clock: src.lastCommitAt ? 'last-commit' : 'pushedAt-fallback',
    verdict: expired ? 'verdict-expired → re-enlist for re-review' : (v?.verdict || 'undecided'),
    reason: expired ? `review window elapsed (${v.reviewBy})` : (v?.reason ?? null),
    reviewBy: v?.reviewBy ?? null,
  }
})
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
  staleUndecided: stale24hAnnotated.filter((s) => s.verdict === 'undecided').length,
  issuesOpen: fleet.reduce((a, r) => a + (r.issuesOpen || 0), 0),
  issuesTop,
  actionsFailing: actionsFailing.length,
  actionsRedInfo: actionsRedInfo.length,
  actionsRedActionable: actionsRedCode.length,
  actionsQuotaGated: quotaGated.length,
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

// --- R328 economy-sovereignty: the sovereignty IS the economy — measured every beat ---
// Reads the economic ledger of record (saos-dex) + the two live income-artery receipts.
// Fail-open: a missed fetch is a named reason, never a silent zero (DECISIONS #14 law:
// "evidence over narrative; every income claim cites a measured receipt").
const economy = {
  sovereigntyLedger: null,
  treasury: null,
  army: null,
  gapsOpen: null,
  fetchedAt: NOW,
  note: null,
}
{
  const raw = async (url) => {
    const r = await fetch(url, { headers: { 'User-Agent': 'pulse-probe/1 (economy lane R328)' } })
    if (!r.ok) throw new Error(`${url.split('/').slice(-1)[0]} -> ${r.status}`)
    return r.text()
  }
  try {
    const eco = JSON.parse(await raw('https://raw.githubusercontent.com/roshpinacare-sys/saos-dex/main/grids/state/economy-sovereignty.json'))
    economy.sovereigntyLedger = {
      schema: eco.schema,
      at: eco.at,
      decision: eco.decision || 'DECISIONS.md #14 ECONOMIC-INVERSION',
      flowDirection: eco.measuredNow?.flowDirection?.currentHonestState || null,
      reviewBy: eco.measuredNow?.reviewBy || null,
    }
    const gaps = eco.measuredNow?.sovereignGaps || []
    economy.gapsOpen = gaps.filter((g) => String(g.status || '').startsWith('OPEN')).length
  } catch (e) { economy.note = `sovereignty ledger unread: ${String(e).slice(0, 100)}` }
  try {
    const t = JSON.parse(await raw('https://raw.githubusercontent.com/roshpinacare-sys/saos-dex/main/grids/state/treasury-public.json'))
    economy.treasury = { at: t.at, verdict: t.verdict, acted: t.acted, openOrders: t.openOrders, trader: t.trader }
  } catch (e) { economy.note = (economy.note ? economy.note + '; ' : '') + `treasury receipt unread: ${String(e).slice(0, 80)}` }
  try {
    const a = JSON.parse(await raw('https://raw.githubusercontent.com/roshpinacare-sys/saos-dex/main/grids/state/army-public.json'))
    economy.army = { at: a.at, verdict: a.verdict, acted: a.acted, roster: a.roster, stasis: a.stasis }
  } catch (e) { economy.note = (economy.note ? economy.note + '; ' : '') + `army receipt unread: ${String(e).slice(0, 80)}` }
  if (economy.gapsOpen != null && economy.gapsOpen > 0) {
    state.reasons.push(`economy-sovereignty: ${economy.gapsOpen} sovereign self-funding gaps OPEN (DECISIONS #14) — redemption ledger active, flow direction = sovereignty funds the operator`)
  }
}

// --- terminal semantics (honest, fail-closed, CALIBRATED) ---
if (repos.length === 0) {
  state.terminal = 'blocked'
} else if (mode !== 'fleet-full') {
  state.terminal = 'degraded'
  state.reasons.push(`visibility: public-only — ${totals.private === 0 ? 'private sight unavailable' : `${totals.private} private repos invisible from this census`} (mode=${mode})`)
} else if (patHealth.ok && (actionsRedCode.length > 0 || quotaGated.length > 0)) {
  // calibrated degrade: ONLY code-level actionable reds speak here (audit noise and the
  // billing gate are recorded as named conditions, never blended into code-failure noise)
  state.terminal = 'degraded'
  if (quotaGated.length > 0) state.reasons.push(`Actions minutes quota-exhausted on private fleet (${quotaGated.length} repos: ${quotaGated.join(', ')}) — billing gate, owner-gated; jobs fail in ~2s with zero executed steps; public organs unaffected (unlimited free minutes)`)
  if (actionsRedCode.length > 0) state.reasons.push(`Actions red (code-level, actionable): ${actionsRedCode.join(', ')}`)
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
  economy,
  totals,
  stale24h,
  stale24hAnnotated,
  actionsFailing,
  actionsRedActionable: actionsRedCode,
  actionsQuotaGated: quotaGated,
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
const AUTONOMY = 'roshpinacare-sys/Autonomy'
const DOMAIN = 'roshpinacare-sys/Domain'
const sources = {}
// SOURCE-LADDER (T-70, root-cause of issue #7): the arteries MOVED — public compute now
// lives on Autonomy while Sandbox is quota-dead private memory. A single-source mirror
// carried frozen ledgers while the living verdict was published one repo away.
// Rule: json lanes try every candidate and carry the FRESHEST by embedded timestamp;
// text lanes take the first candidate in order (living producer listed first);
// profitOracle keeps its Sandbox-only shape contract with the Domain loader.
const rawGet = async (repo, path) => {
  const url = `https://raw.githubusercontent.com/${repo}/main/${path}`
  let res = await fetch(url, { headers: H(FLEET_TOKEN || GITHUB_TOKEN), signal: AbortSignal.timeout(20000) })
  if (res.status === 404) return { miss: '404' }
  if (!res.ok) {
    const c = await gh(`/repos/${repo}/contents/${path}`, FLEET_TOKEN || GITHUB_TOKEN)
    if (c.status !== 200 || !c.data?.content) return { miss: `raw ${res.status}/contents ${c.status}` }
    const buf = Buffer.from(c.data.content, 'base64')
    return { body: buf }
  }
  return { body: await res.arrayBuffer() }
}
const tsOf = (b) => {
  if (!b || typeof b !== 'object') return null
  const t = b.generatedAt || b.at || b.timestamp || null
  const d = t ? new Date(t) : null
  return d && !isNaN(d) ? d.toISOString() : null
}
async function grabLadder(key, candidates, kind) {
  const tried = []
  let best = null
  for (const [repo, path] of candidates) {
    try {
      const r = await rawGet(repo, path)
      if (r.miss) { tried.push({ repo, path, error: r.miss }); continue }
      let body
      if (kind === 'text') body = Buffer.from(r.body).toString('utf8')
      else body = JSON.parse(Buffer.from(r.body).toString('utf8'))
      tried.push({ repo, path, at: tsOf(body) })
      if (kind === 'json') {
        const t = tsOf(body)
        const bt = best ? tsOf(best.body) : null
        if (!best || (t && (!bt || new Date(t) > new Date(bt)))) best = { repo, path, body }
      } else if (!best) best = { repo, path, body }
    } catch (e) {
      tried.push({ repo, path, error: String(e?.message || e).slice(0, 80) })
    }
  }
  sources[key] = best
    ? { at: NOW, path: best.path, source: best.repo, candidates: tried, [kind === 'text' ? 'text' : 'data']: best.body }
    : { at: NOW, path: candidates.map((c) => c[1]).join(' | '), error: `no candidate carried — honest gap (${tried.map((t) => t.error || t.at || '?').join('; ')})` }
}
await Promise.all([
  grabLadder('lessons', [[AUTONOMY, 'ops/lessons/ledger.md'], [SANDBOX, 'ops/lessons/ledger.md']], 'text'),
  grabLadder('flowMap', [[SANDBOX, 'ops/flow/flow-map.json'], [AUTONOMY, 'ops/flow/flow-map.json']], 'json'),
  grabLadder('integrity', [[SANDBOX, 'ops/integrity/verdict.json'], [AUTONOMY, 'ops/integrity/verdict.json']], 'json'),
  grabLadder('decisionTruth', [[SANDBOX, 'ops/decision-truth/verdict.json'], [AUTONOMY, 'ops/decision-truth/verdict.json']], 'json'),
  grabLadder('profitOracle', [[SANDBOX, 'receipts/profit-oracle-latest.json']], 'json'),
  // R335 · THE SOVEREIGN BOOK (T-90, trace 1a139fae43eccbc9): the fleet's PUBLISHED
  // work gets its own face — Domain's keyless chain-truth ledger (public RPC, refs-scrubbed,
  // no handles) mirrored into this public shell so the backup display survives BOTH a
  // chain-front shelling (T-81: steemit.com shelved the whole roster while the chain
  // stayed whole) AND a node outage (the committed mirror renders with zero network).
  // The record lives in git; the display reads git. That is the backup property.
  grabLadder('publishedBook', [[DOMAIN, 'content/published.json']], 'json'),
])
// research: date-named files — CI walks back up to 9 days for the latest findings
{
  const p = (n) => String(n).padStart(2, '0')
  let done = false
  for (let back = 0; back <= 9 && !done; back++) {
    const d = new Date(Date.now() - back * 86400e3)
    const path = `research/findings-${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}.json`
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${SANDBOX}/main/${path}`, { headers: H(FLEET_TOKEN || GITHUB_TOKEN), signal: AbortSignal.timeout(20000) })
      if (res.ok) { sources.research = { at: NOW, path, data: await res.json() }; done = true }
    } catch {}
  }
  if (!done) sources.research = { at: NOW, path: 'research/findings-*.json', error: 'no findings file within 9 days — honest gap' }
}
// live chain probes (the probe lanes live again, on public infra)
// NODE-LADDER (T23-C, 2026-10-13): a single node answered before — if that one node
// throttles, the mirror would read "chain dark" while the chain is fine. Now every
// chain walks a verified node ladder (each node answered condenser_api
// get_dynamic_global_properties 200-OK from CI's class of network on 2026-10-13:
// steem 0.6-0.85s, hive 0.26-0.8s). First answering node wins; every attempt is
// recorded (node, ms, head, ok) so a throttling first node is VISIBLE, not silent.
const CHAIN_NODES = {
  steem: ['https://api.steemit.com', 'https://api.justyy.com', 'https://api.steem.fans'],
  hive: ['https://api.hive.blog', 'https://api.deathwing.me', 'https://api.openhive.network'],
}
const rpcHead = async (url) => {
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: ['condenser_api', 'get_dynamic_global_properties', []], id: 1 }),
      signal: AbortSignal.timeout(15000),
    })
    return (await r.json())?.result ?? null // full props — head AND vesting supply (treasury math needs both)
  } catch { return null }
}
const rpcAccount = async (url, name) => {
  try {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: ['condenser_api', 'get_accounts', [[name]]], id: 2 }),
      signal: AbortSignal.timeout(15000),
    })
    return (await r.json())?.result?.[0] ?? null
  } catch { return null }
}
const vestNum = (s) => { const n = parseFloat(String(s ?? '').split(' ')[0]); return Number.isFinite(n) ? n : null }
const chainProbes = {}
const rpcHeadLadder = async (chain, urls) => {
  const tries = []
  chainProbes[chain] = tries
  for (const url of urls) {
    const t0 = Date.now()
    const res = await rpcHead(url)
    const head = res?.head_block_number ?? null
    tries.push({ node: url.replace('https://', ''), ms: Date.now() - t0, head, ok: head != null })
    if (head != null) return { head, res, url } // first-responding node is the source of truth
  }
  return { head: null, res: null, url: null }
}
const chains = { hiveHead: null, steemHead: null }
const steemHit = await rpcHeadLadder('steem', CHAIN_NODES.steem)
const hiveHit = await rpcHeadLadder('hive', CHAIN_NODES.hive)
chains.steemHead = steemHit.head
chains.hiveHead = hiveHit.head
chains.steemNode = steemHit.url ? steemHit.url.replace('https://', '') : null
chains.hiveNode = hiveHit.url ? hiveHit.url.replace('https://', '') : null
chains.steemNodes = chainProbes.steem
chains.hiveNodes = chainProbes.hive
// T23-C2: treasury measured on the ANSWERING node only — never a second opinion from a
// different node, no faking. steem.dao is the chain treasury; SP is derived from vesting
// shares against THIS run's live supply (tvf/tvs from the same head result). Measured
// 2026-10-13: steem.dao holds 0 SP (its value sits in liquid STEEM/SBD) — recorded as-is.
if (steemHit.url && steemHit.res) {
  const acc = await rpcAccount(steemHit.url, 'steem.dao')
  const tvs = vestNum(steemHit.res.total_vesting_shares)
  const tvf = vestNum(steemHit.res.total_vesting_fund_steem)
  const vests = vestNum(acc?.vesting_shares)
  const sp = acc && tvs > 0 && tvf != null && vests != null ? (vests / tvs) * tvf : null
  chains.steemTreasury = {
    account: 'steem.dao',
    sp: sp == null ? null : Math.round(sp * 1000) / 1000,
    steem: acc?.balance != null ? vestNum(acc.balance) : null,
    sbd: acc?.sbd_balance != null ? vestNum(acc.sbd_balance) : null,
    via: chains.steemNode,
    at: NOW,
  }
} else {
  chains.steemTreasury = { account: 'steem.dao', error: 'no steem node answered — honest gap', at: NOW }
}
const mirror = scrubVal({
  schema: 'pulse-mirror-v1',
  generatedAt: NOW,
  trigger: TRIGGER,
  provenance: 'CI-carried from roshpinacare-sys/Sandbox public-grade ledgers (darkened by the T-66 repo flip, not by content) + live chain probes. Sanitized output of a §7 runner shell.',
  chains,
  sources,
}) // 3-c refs law: the whole mirror passes the estate-name scrub at write time
const mirrorJson = JSON.stringify(mirror)
if (mirrorJson.length > 600000) {
  // size guard — carry stamps honestly instead of oversized payloads
  for (const k of ['flowMap', 'research', 'profitOracle']) {
    if (sources[k]?.data && JSON.stringify(sources[k].data).length > 150000) sources[k] = { at: NOW, path: sources[k].path, error: 'payload too large for public mirror — carried as gap' }
  }
}
await writeFile('mirror/lanes.json', JSON.stringify(mirror, null, 1), 'utf-8')
console.log(`mirror: sources=${Object.keys(sources).length} chains=${chains.hiveHead ?? '-'}/${chains.steemHead ?? '-'}`)

// T23-C2: the STATE receipt carries the same chain section — one story in both files,
// no recompute, no divergence. Public chain data only (no estate names, no secrets).
try {
  const net = JSON.parse(await readFile('state/network.json', 'utf-8'))
  net.chains = {
    schema: 'pulse-chains-v1',
    at: NOW,
    steem: { head: chains.steemHead, node: chains.steemNode, treasury: chains.steemTreasury, tries: chains.steemNodes },
    hive: { head: chains.hiveHead, node: chains.hiveNode, tries: chains.hiveNodes },
  }
  await writeFile('state/network.json', JSON.stringify(net, null, 1), 'utf-8')
} catch (e) { console.log(`chains->network.json: ${String(e?.message || e)}`) }

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
