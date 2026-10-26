// economy-sources.mjs — the raw-first economy reader (wave #82, trace 1a178c614313ad05).
//
// WHY THIS EXISTS (measured 2026-10-26): the Pulse heartbeat's FLEET_TOKEN Actions secret
// returns HTTP 401 (expired/revoked — owner-custody rotation pending), and the generator
// read every economy source through the AUTHENTICATED contents API only — so the whole
// economy block starved to nulls while the data sat in PUBLIC repos. Measured same day:
// every saos-dex grids/state/*.json answers HTTP 200 on raw.githubusercontent.com with NO
// token at all. Public raw reads work forever for public repos; a token can only die.
//
// LAWS:
//   1. RAW FIRST — tokenless raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}.
//   2. API ONLY AS FALLBACK — authenticated contents API, tried only when raw fails
//      (covers a future private-flip or a raw outage; never a dependency).
//   3. HONEST MODE PER SOURCE — 'raw' | 'api' | 'unreachable' with the real HTTP
//      statuses; an unreachable source stays unreachable (named error, never fabricated).
//   4. CACHE NOTHING — every call is a live measurement; no memoization anywhere.
//   5. ZERO FABRICATION — deriveGapsBlock copies fetched fields verbatim; a gap whose
//      data is absent says dataAbsent=true and nothing else about its content.
export const RAW_BASE = 'https://raw.githubusercontent.com'
const API = 'https://api.github.com'

export function rawUrl(owner, repo, path, ref = 'main') {
  const refSeg = String(ref || 'main').replace(/^refs\/(heads|tags)\//, '')
  return `${RAW_BASE}/${owner}/${repo}/${refSeg}/${String(path).replace(/^\//, '')}`
}

// Fetch ONE JSON source through the raw-first ladder.
// opts: { owner, repo, path, ref?, apiToken?, fetchImpl?, timeoutMs? }
// returns { source, mode: 'raw'|'api'|'unreachable', http: {raw, api}, data, error }
export async function fetchJsonSource({ owner, repo, path, ref = 'main', apiToken = '', fetchImpl = fetch, timeoutMs = 20000 }) {
  const source = `${repo}/${path}`
  const out = { source, mode: 'unreachable', http: { raw: 0, api: null }, data: null, error: null }
  const parseRaw = async () => {
    const res = await fetchImpl(rawUrl(owner, repo, path, ref), { headers: { 'User-Agent': 'pulse-economy-reader' }, signal: AbortSignal.timeout(timeoutMs) })
    out.http.raw = res.status
    if (!res.ok) return false
    const body = await res.json() // throws on garbage -> counts as a raw failure
    out.data = body
    return true
  }
  try {
    if (await parseRaw()) {
      out.mode = 'raw'
      return out
    }
  } catch (e) {
    out.error = `raw ${rawUrl(owner, repo, path, ref)} failed: ${String(e?.message || e).slice(0, 120)}`
  }
  if (!out.error) out.error = `raw ${rawUrl(owner, repo, path, ref)} -> HTTP ${out.http.raw}`
  // fallback: authenticated contents API (only if a token exists — tokenless API probing
  // would just burn rate for sources raw already failed to reach)
  if (!apiToken) return out
  try {
    const res = await fetchImpl(`${API}/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'pulse-economy-reader', Authorization: `Bearer ${apiToken}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
    out.http.api = res.status
    if (!res.ok) {
      out.error = `${out.error}; contents-api -> HTTP ${res.status}`
      return out
    }
    const j = await res.json()
    if (!j?.content) {
      out.error = `${out.error}; contents-api returned no content`
      return out
    }
    out.data = JSON.parse(Buffer.from(j.content, 'base64').toString('utf-8'))
    out.mode = 'api'
    out.error = null
  } catch (e) {
    out.error = `${out.error}; contents-api failed: ${String(e?.message || e).slice(0, 120)}`
  }
  return out
}

// Derive the honest gaps block from FETCHED sources only (GAP-1 compute wall / GAP-2
// canary gear / GAP-3 dormant assets — owner directive §4). Verbatim fields carry their
// sourcePath; anything not present in the data is absent, never invented.
// args: { sovereignty?, gearbox?, dormantLedger?, now, patHealth }
//   sovereignty/gearbox: fetchJsonSource results (economy-sovereignty / policy-gears)
//   dormantLedger: parsed Pulse state/dormant-decisions.json (local repo file) or null
//   patHealth: probe's measured PAT health { ok, status, ... }
export function deriveGapsBlock({ sovereignty, gearbox, dormantLedger, now, patHealth }) {
  const blockers = []
  if (patHealth && !patHealth.ok) {
    blockers.push(
      patHealth.status === 'missing'
        ? 'FLEET_TOKEN/GH_PAT absent from this run — the Pulse heartbeat secret last measured HTTP 401 on cloud (expired/revoked) = owner-custody rotation pending; this raw-first reader needs no token by design'
        : `FLEET_TOKEN probe HTTP ${patHealth.status} (expired/revoked) = owner-custody rotation pending; economy/gaps sources unaffected — raw ladder is tokenless by design`,
    )
  } else if (patHealth?.ok && patHealth.secret === 'GH_PAT') {
    // FLEET_TOKEN absent but the ladder answered via GH_PAT: the heartbeat-secret 401
    // stays a standing measured condition (cloud runs recorded it), named, not hidden.
    blockers.push('FLEET_TOKEN (heartbeat secret) absent from this run — census ran on the GH_PAT fallback rung; the Pulse FLEET_TOKEN secret measured HTTP 401 on cloud (expired/revoked) = owner-custody rotation pending; economy/gaps sources unaffected — raw ladder is tokenless by design')
  }
  const block = { schema: 'pulse-gaps/2', at: now, derivation: 'generator-derived from fetched sources only — verbatim fields, zero fabrication; a gap with no fetched data says dataAbsent=true', blockers, gap1: null, gap2: null, gap3: null }

  // GAP-1 — compute wall / economic sovereignty (ledger: saos-dex economy-sovereignty.json)
  if (sovereignty?.data) {
    const m = sovereignty.data.measuredNow || {}
    const gapsArr = Array.isArray(m.sovereignGaps) ? m.sovereignGaps : []
    block.gap1 = {
      id: 'GAP-1',
      title: 'COMPUTE WALL — internal yield capture vs private-fleet compute overhead',
      sourcePath: 'roshpinacare-sys/saos-dex grids/state/economy-sovereignty.json',
      fetchedVia: sovereignty.mode,
      http: sovereignty.http,
      ledgerAt: sovereignty.data.at ?? null,
      dataAbsent: false,
      gapsOpen: gapsArr.filter((g) => String(g.status || '').startsWith('OPEN')).length,
      flowDirection: m.flowDirection?.currentHonestState ?? null,
      ownerDividendLane: m.ownerDividendLane ?? null,
      selfDepositProof: m.selfDepositProof ?? null,
      reviewBy: m.reviewBy ?? null,
      status: gapsArr.some((g) => String(g.status || '').startsWith('OPEN')) ? 'ledger records OPEN sovereign gaps' : 'ledger records no OPEN sovereign gaps',
    }
  } else {
    block.gap1 = { id: 'GAP-1', sourcePath: 'roshpinacare-sys/saos-dex grids/state/economy-sovereignty.json', dataAbsent: true, status: null, error: sovereignty?.error || 'source not fetched this run' }
  }

  // GAP-2 — canary volume gear (ledger: saos-dex policy-gears.json; fields verbatim)
  if (gearbox?.data) {
    const g = gearbox.data
    const st = g.state || {}
    const gears = Array.isArray(g.gears) ? g.gears : []
    const next = gears.map((r) => r?.require?.greenStreak).filter((n) => Number.isFinite(n) && n > st.greenStreak).sort((a, b) => a - b)[0]
    block.gap2 = {
      id: 'GAP-2',
      title: 'CANARY VOLUME GEAR — receipt-driven gear shifts on green ladder streaks',
      sourcePath: 'roshpinacare-sys/saos-dex grids/state/policy-gears.json',
      fetchedVia: gearbox.mode,
      http: gearbox.http,
      ledgerAt: g.at ?? st.at ?? null,
      dataAbsent: false,
      gear: st.gear ?? null,
      greenStreak: st.greenStreak ?? null,
      nextUpshiftRequire: Number.isFinite(next) ? next : null,
      lastVerdict: st.lastVerdict ?? null,
      lastKind: st.lastKind ?? null,
      lastStateAt: st.at ?? null,
      kelly: st.kelly ?? (g.kelly?.enabled ? { mode: 'enabled-stateless' } : null),
      gearsCount: gears.length || null,
      status: st.gear != null ? `gear ${st.gear}, greenStreak ${st.greenStreak ?? '?'}${Number.isFinite(next) ? ` (next upshift requires ${next})` : ''}, lastVerdict ${st.lastVerdict ?? '?'}` : null,
    }
  } else {
    block.gap2 = { id: 'GAP-2', sourcePath: 'roshpinacare-sys/saos-dex grids/state/policy-gears.json', dataAbsent: true, status: null, error: gearbox?.error || 'source not fetched this run' }
  }

  // GAP-3 — dormant assets (ledger: Pulse state/dormant-decisions.json — the fleet's own
  // planned-state ledger: "a documented verdict is a PLANNED state, never a silenced one")
  if (dormantLedger?.repos) {
    const tally = {}
    for (const r of dormantLedger.repos) tally[r.verdict] = (tally[r.verdict] || 0) + 1
    block.gap3 = {
      id: 'GAP-3',
      title: 'DORMANT ASSETS — inventory + quality-gated awakening (planned-state ledger)',
      sourcePath: 'roshpinacare-sys/Pulse state/dormant-decisions.json',
      fetchedVia: 'local-repo-file',
      ledgerAt: dormantLedger.decidedAt ?? null,
      dataAbsent: false,
      decidedBy: dormantLedger.decidedBy ?? null,
      reviewBy: dormantLedger.reviewBy ?? null,
      reposCount: dormantLedger.repos.length,
      verdictTally: tally,
      status: `ledger: ${dormantLedger.repos.length} repos with documented verdicts (${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(', ')})`,
    }
  } else {
    block.gap3 = { id: 'GAP-3', sourcePath: 'roshpinacare-sys/Pulse state/dormant-decisions.json', dataAbsent: true, status: null, error: dormantLedger ? 'ledger carries no repos array' : 'ledger not readable this run' }
  }

  return block
}
