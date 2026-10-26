// Tests for scripts/lib/economy-sources.mjs — the raw-first economy reader (wave #82).
// Run: node --test scripts/
// Convention note: this repo had NO test convention before this file (no package.json,
// no test runner) — minimal zero-dependency node:test suite chosen so CI (node) runs it
// with zero installs.
// Law under test: raw.githubusercontent.com FIRST (tokenless — public repos need no
// token, works forever), authenticated contents API ONLY as fallback, honest
// raw|api|unreachable mode per source, nothing cached, zero fabrication in the gaps block.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rawUrl, fetchJsonSource, deriveGapsBlock } from './lib/economy-sources.mjs'

// helper: fetchImpl double that logs every call and answers from a scripted list
function scriptedFetch(responses) {
  const calls = []
  const fn = async (url, opts = {}) => {
    calls.push({ url, headers: opts.headers || {}, method: opts.method || 'GET' })
    const key = calls.length - 1
    const r = responses[Math.min(key, responses.length - 1)]
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({ message: 'HTTP ' + r }) }
    if (r instanceof Error) throw r
    return { ok: true, status: 200, json: async () => (typeof r === 'string' ? JSON.parse(r) : r) }
  }
  return { fn, calls }
}

const jsonOf = (o) => JSON.stringify(o)

test('rawUrl builds the tokenless raw address (ref defaults to main)', () => {
  assert.equal(rawUrl('roshpinacare-sys', 'saos-dex', 'grids/state/policy-gears.json'),
    'https://raw.githubusercontent.com/roshpinacare-sys/saos-dex/main/grids/state/policy-gears.json')
  assert.equal(rawUrl('o', 'r', 'p.json', 'refs/heads/x'),
    'https://raw.githubusercontent.com/o/r/x/p.json', 'full ref names canonicalize to the branch segment')
})

test('raw-first: raw 200 answers and the authenticated API is NEVER called', async () => {
  const body = jsonOf({ schema: 'SAOS-POLICY-GEARS/1', state: { gear: 1 } })
  const s = scriptedFetch([body])
  const out = await fetchJsonSource({ owner: 'roshpinacare-sys', repo: 'saos-dex', path: 'grids/state/policy-gears.json', apiToken: 'SECRET-TOKEN', fetchImpl: s.fn })
  assert.equal(out.mode, 'raw')
  assert.equal(out.data.schema, 'SAOS-POLICY-GEARS/1')
  assert.equal(out.http.raw, 200)
  assert.equal(out.http.api, null)
  assert.equal(out.error, null)
  assert.equal(s.calls.length, 1, 'exactly one network call — raw succeeded')
  assert.ok(s.calls[0].url.startsWith('https://raw.githubusercontent.com/'))
  assert.equal(s.calls[0].headers.Authorization, undefined, 'raw call carries NO token header')
})

test('fallback: raw 404 -> authenticated contents API with the token -> mode api', async () => {
  // call 0: raw 404; call 1: contents API 200 base64
  const calls = []
  const fn = async (url, opts = {}) => {
    calls.push({ url, headers: opts.headers || {} })
    if (url.startsWith('https://raw.githubusercontent.com/')) return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) }
    return { ok: true, status: 200, json: async () => ({ content: Buffer.from(jsonOf({ at: '2026-10-26T09:23:55.173Z', verdict: 'LADDER-ACTED' })).toString('base64'), encoding: 'base64' }) }
  }
  const out = await fetchJsonSource({ owner: 'roshpinacare-sys', repo: 'saos-dex', path: 'grids/state/treasury-public.json', apiToken: 'SECRET-TOKEN', fetchImpl: fn })
  assert.equal(out.mode, 'api')
  assert.equal(out.data.verdict, 'LADDER-ACTED')
  assert.equal(out.http.raw, 404)
  assert.equal(out.http.api, 200)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].headers.Authorization, 'Bearer SECRET-TOKEN', 'api fallback authenticates')
  assert.ok(calls[1].url.includes('/contents/grids/state/treasury-public.json'))
})

test('fallback on parse-failure: raw 200 with garbage JSON counts as raw failure -> api answers', async () => {
  const calls = []
  const fn = async (url, opts = {}) => {
    calls.push(url)
    if (url.startsWith('https://raw.githubusercontent.com/')) return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token') } }
    return { ok: true, status: 200, json: async () => ({ content: Buffer.from(jsonOf({ ok: 1 })).toString('base64'), encoding: 'base64' }) }
  }
  const out = await fetchJsonSource({ owner: 'o', repo: 'r', path: 'p.json', apiToken: 'T', fetchImpl: fn })
  assert.equal(out.mode, 'api')
  assert.equal(out.data.ok, 1)
  assert.equal(calls.length, 2)
})

test('honest unreachable: raw fails and no apiToken exists -> unreachable, data null, no fabrication', async () => {
  const s = scriptedFetch([404])
  const out = await fetchJsonSource({ owner: 'o', repo: 'r', path: 'p.json', apiToken: '', fetchImpl: s.fn })
  assert.equal(out.mode, 'unreachable')
  assert.equal(out.data, null)
  assert.equal(out.http.raw, 404)
  assert.equal(out.http.api, null)
  assert.ok(out.error && out.error.length > 0, 'carries an honest error string')
})

test('honest unreachable: raw fails AND api fails -> both statuses recorded', async () => {
  const s = scriptedFetch([500, 401])
  const out = await fetchJsonSource({ owner: 'o', repo: 'r', path: 'p.json', apiToken: 'DEAD', fetchImpl: s.fn })
  assert.equal(out.mode, 'unreachable')
  assert.equal(out.http.raw, 500)
  assert.equal(out.http.api, 401)
  assert.ok(String(out.error).includes('401'), 'error names the api failure')
})

// --- deriveGapsBlock: zero-fabrication derivation ---

const fullSources = () => ({
  sovereignty: {
    source: 'saos-dex/grids/state/economy-sovereignty.json', mode: 'raw', http: { raw: 200, api: null }, error: null,
    data: {
      schema: 'SAOS-ECONOMY-SOVEREIGNTY/1', at: '2026-10-14T12:35:00Z',
      measuredNow: {
        at: '2026-10-14T12:35:00Z',
        flowDirection: { currentHonestState: 'SELF-DEPOSIT PROVEN (convert maturity ~486 STEEM)' },
        reviewBy: '2026-11-19T00:00:00Z',
        ownerDividendLane: { pendingReleaseUsd: 0.0026 },
      },
    },
  },
  gearbox: {
    source: 'saos-dex/grids/state/policy-gears.json', mode: 'raw', http: { raw: 200, api: null }, error: null,
    data: {
      protocol: 'SAOS-POLICY-GEARS/1',
      state: { gear: 1, greenStreak: 1, lastVerdict: 'ARMY-ACTED', at: '2026-10-26T15:50:43.438Z', kelly: { mode: 'kelly', capSbd: 3 } },
      gears: [{ gear: 1, require: { greenStreak: 0 } }, { gear: 2, require: { greenStreak: 6 } }, { gear: 3, require: { greenStreak: 12 } }],
    },
  },
  dormantLedger: {
    schema: 'pulse-dormant-decisions/1', decidedAt: '2026-10-14T07:15:00Z', reviewBy: '2026-11-13T00:00:00Z',
    repos: [
      { repo: 'a', verdict: 'revived' }, { repo: 'b', verdict: 'keep-dormant-on-purpose' }, { repo: 'c', verdict: 'keep-dormant-on-purpose' },
    ],
  },
})

test('gaps block: full data -> all three gaps present, dataAbsent=false, verbatim fields carried', () => {
  const g = deriveGapsBlock({ ...fullSources(), now: '2026-10-26T16:30:00.000Z', patHealth: { ok: false, status: 'missing' } })
  assert.equal(g.schema, 'pulse-gaps/2')
  assert.equal(g.gap1.dataAbsent, false)
  assert.equal(g.gap2.dataAbsent, false)
  assert.equal(g.gap3.dataAbsent, false)
  assert.equal(g.gap1.sourcePath, 'roshpinacare-sys/saos-dex grids/state/economy-sovereignty.json')
  assert.equal(g.gap1.flowDirection, 'SELF-DEPOSIT PROVEN (convert maturity ~486 STEEM)', 'verbatim from source')
  assert.equal(g.gap2.gear, 1)
  assert.equal(g.gap2.greenStreak, 1)
  assert.equal(g.gap2.lastVerdict, 'ARMY-ACTED', 'verbatim from source')
  assert.deepEqual(g.gap2.kelly, { mode: 'kelly', capSbd: 3 }, 'verbatim kelly snapshot')
  assert.equal(g.gap2.nextUpshiftRequire, 6, 'derived arithmetically from the fetched gear table')
  assert.equal(g.gap3.sourcePath, 'roshpinacare-sys/Pulse state/dormant-decisions.json')
  assert.deepEqual(g.gap3.verdictTally, { revived: 1, 'keep-dormant-on-purpose': 2 })
  assert.equal(g.gap3.reposCount, 3)
})

test('gaps block: gapsOpen counts only OPEN* statuses from the ledger sovereignGaps array', () => {
  const s = fullSources()
  s.sovereignty.data.measuredNow.sovereignGaps = [{ status: 'OPEN-1' }, { status: 'OPEN-2' }, { status: 'CLOSED' }]
  const g = deriveGapsBlock({ ...s, now: 'x', patHealth: { ok: true, status: '200' } })
  assert.equal(g.gap1.gapsOpen, 2)
})

test('gaps block: sovereignGaps absent from the ledger -> gapsOpen=0 honestly (not null, not fabricated)', () => {
  const g = deriveGapsBlock({ ...fullSources(), now: 'x', patHealth: { ok: true, status: '200' } })
  assert.equal(g.gap1.gapsOpen, 0)
})

test('gaps block: unreachable source -> that gap says dataAbsent=true, status null, error carried', () => {
  const s = fullSources()
  delete s.gearbox
  s.dormantLedger = null
  const g = deriveGapsBlock({ ...s, now: 'x', patHealth: { ok: false, status: '401' } })
  assert.equal(g.gap2.dataAbsent, true)
  assert.equal(g.gap2.status, null)
  assert.ok(g.gap2.error && String(g.gap2.error).length > 0)
  assert.equal(g.gap2.gear, undefined, 'no fabricated gear field')
  assert.equal(g.gap3.dataAbsent, true)
  assert.equal(g.blockers.length, 1)
  assert.ok(String(g.blockers[0]).includes('401'), 'token blocker recorded honestly')
  assert.ok(String(g.blockers[0]).includes('owner-custody rotation pending'))
})

test('gaps block: healthy FLEET_TOKEN -> blockers empty', () => {
  const g = deriveGapsBlock({ ...fullSources(), now: 'x', patHealth: { ok: true, status: '200', secret: 'FLEET_TOKEN' } })
  assert.deepEqual(g.blockers, [])
})

test('gaps block: GH_PAT fallback rung (FLEET_TOKEN absent) -> blocker names the cloud 401 + owner rotation', () => {
  const g = deriveGapsBlock({ ...fullSources(), now: 'x', patHealth: { ok: true, status: '200', secret: 'GH_PAT' } })
  assert.equal(g.blockers.length, 1)
  assert.ok(String(g.blockers[0]).includes('FLEET_TOKEN'))
  assert.ok(String(g.blockers[0]).includes('HTTP 401'))
  assert.ok(String(g.blockers[0]).includes('owner-custody rotation pending'))
})

test('gaps block: gap2 next-upshift derivation walks the gear table (streak 6 -> require 12)', () => {
  const s = fullSources()
  s.gearbox.data.state.greenStreak = 6
  s.gearbox.data.state.gear = 2
  const g = deriveGapsBlock({ ...s, now: 'x', patHealth: { ok: true, status: '200' } })
  assert.equal(g.gap2.nextUpshiftRequire, 12)
  assert.equal(g.gap2.gear, 2)
})

test('gaps block: gap1 absent sovereignty -> dataAbsent with honest error, others untouched', () => {
  const s = fullSources()
  delete s.sovereignty
  const g = deriveGapsBlock({ ...s, now: 'x', patHealth: { ok: true, status: '200' } })
  assert.equal(g.gap1.dataAbsent, true)
  assert.equal(g.gap1.status, null)
  assert.equal(g.gap2.dataAbsent, false)
  assert.equal(g.gap3.dataAbsent, false)
})
