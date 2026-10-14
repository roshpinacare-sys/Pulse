/* GIANT v3 — trade products layer · מסוף-מסחר · בריכות · נגזרות (additive to v2 · אפס-מפתחות · כנות-תלת-מצבית) */
"use strict";

/* ============ session state ============ */
const T = { pair: "SAOS/USDS", tf: 48, slip: 0.5,
  swap: { from: "SAOS", to: "USDS", amt: "" },
  tick: { side: "buy", type: "limit", px: "", qty: "" },
  perp: { asset: "BTC", lev: 10, dir: "long", size: "" },
  poolsel: 0 };
const INTENTS = [];
const PERPPOS = (() => { try { return JSON.parse(localStorage.getItem("giant:perp-positions") || "[]"); } catch (e) { return []; } })();
const savePerp = () => { try { localStorage.setItem("giant:perp-positions", JSON.stringify(PERPPOS.slice(0, 40))); } catch (e) { } };

/* ============ market helpers (all raw engine units — honest) ============ */
const stt = () => st();
const TOPB = () => (S.dex && S.dex.top) || (typeof DEX0 !== "undefined" && DEX0 && (DEX0.markets || DEX0.pools || DEX0.wallets) ? DEX0 : {});
function markets() { return (TOPB().markets || []); }
function findMarket(key) { return markets().find(m => m.key === key) || markets()[0] || null; }
function pools() { return (TOPB().pools || []); }
function walletsB() { return (TOPB().wallets || []); }
function ordersB() { return (TOPB().orders || []); }
function sealB() { return TOPB().seal || {}; }
function metricsB() { return TOPB().metrics || {}; }
function usdRef(asset) { const a = (stt().assets || {})[asset]; return a && a.refPrice != null ? a.refPrice / 1000 : null; } /* USDS per unit (v2 tape convention) */
function oracleUsd(sym) { const o = (stt().oracle || {})[sym]; return o && o.mu != null ? o.mu / 1e6 : null; } /* USD */
function maxBookTotal(m) {
  let mx = 0; (m.bids || []).concat(m.asks || []).forEach(r => { if (r.total > mx) mx = r.total; }); return mx || 1;
}
function bookRows(m, kind) {
  const rows = (kind === "ask" ? (m.asks || []).slice().sort((a, b) => a.price - b.price) : (m.bids || []).slice().sort((a, b) => b.price - a.price));
  const mx = maxBookTotal(m);
  return rows.slice(0, 9).map(r => {
    const pct = Math.max(4, Math.min(100, (r.total / mx) * 100));
    const fill = m.fair && m.refPrice ? (r.price / (m.refPrice || r.price)) : null;
    return { p: r.price, t: r.total, o: r.orders || 1, pct };
  });
}

/* ============ deterministic candle reconstruction (envelope REAL: high/low/last/ref; path labeled) ============ */
function makeCandles(m, s, n) {
  const s24 = m.stats24 || {};
  const last = s24.last || m.fair || m.refPrice || 1;
  const hi = s24.high24 || last, lo = s24.low24 || last;
  const chg = (s24.chg24Bps || 0) / 1e4;
  const open0 = last / (1 + chg || 1);
  let seed = 7; const seedStr = String(s.stateRoot || "x") + m.key + n;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const vol = (hi - lo) || Math.abs(last) * 0.006 || 1;
  const vol24 = (s24.vol24QuoteMu || 0) || ((metricsB().today && metricsB().today.vol24QuoteMu) || 0);
  const out = []; let prev = Math.min(Math.max(open0, lo), hi);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = Math.min(Math.max(open0 + (last - open0) * t, lo), hi);
    const noise = (rnd() - 0.5) * 2 * vol * 0.55 * (0.35 + 0.65 * rnd()) * (1 - t * 0.25);
    const o = prev; let c = Math.min(Math.max(base + noise, lo), hi);
    let h = Math.min(Math.max(o, c) + rnd() * vol * 0.32, hi);
    let l = Math.max(Math.min(o, c) - rnd() * vol * 0.32, lo);
    const v = (vol24 / n) * (0.35 + 1.3 * rnd());
    out.push({ o, c, h, l, v }); prev = c;
  }
  out[n - 1].c = last; out[n - 1].h = Math.max(out[n - 1].h, last); out[n - 1].l = Math.min(out[n - 1].l, last);
  return out;
}
function candleSvg(cs, W, H) {
  W = W || 660; H = H || 328;
  const PH = 244, VH = 58, GAP = 10; /* price height, volume height */
  const csAll = cs.length ? cs : [];
  const mn = Math.min(...csAll.map(k => k.l)), mx = Math.max(...csAll.map(k => k.h));
  const rg = (mx - mn) || 1; const pad = rg * 0.08;
  const y = v => 6 + (1 - ((v - (mn - pad)) / (rg + pad * 2))) * (PH - 12);
  const vmx = Math.max(...csAll.map(k => k.v), 1);
  const bw = W / Math.max(csAll.length, 1); const cwd = Math.max(2, bw * 0.62);
  let grid = "", vol = "", bars = "", axis = "";
  for (let g = 0; g <= 4; g++) { const gv = (mn - pad) + (g / 4) * (rg + pad * 2); const gy = y(gv);
    grid += `<line x1="0" y1="${gy.toFixed(1)}" x2="${W}" y2="${gy.toFixed(1)}" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="2 5"/>`;
    axis += `<text x="${W - 3}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="8.5" fill="var(--faint)" font-family="var(--mono)">${fmt(gv)}</text>`; }
  csAll.forEach((k, i) => {
    const x = i * bw + bw / 2, up = k.c >= k.o;
    const col = up ? "var(--green)" : "var(--red)";
    vol += `<rect x="${(x - cwd / 2).toFixed(1)}" y="${(H - k.v / vmx * VH).toFixed(1)}" width="${cwd.toFixed(1)}" height="${(k.v / vmx * VH).toFixed(1)}" fill="${col}" opacity="0.28"/>`;
    bars += `<line x1="${x.toFixed(1)}" y1="${y(k.h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${y(k.l).toFixed(1)}" stroke="${col}" stroke-width="1"/>`
      + `<rect x="${(x - cwd / 2).toFixed(1)}" y="${y(Math.max(k.o, k.c)).toFixed(1)}" width="${cwd.toFixed(1)}" height="${Math.max(1.4, Math.abs(y(k.o) - y(k.c))).toFixed(1)}" fill="${col}" rx="0.8"/>`;
  });
  const lastC = csAll[csAll.length - 1] || { c: 0 };
  const lyN = y(lastC.c); const ly = lyN.toFixed(1);
  return `<svg viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-label="גרף נרות">${grid}${axis}
  <g>${vol}</g><g>${bars}</g>
  <line x1="0" y1="${ly}" x2="${W}" y2="${ly}" stroke="var(--gold)" stroke-width="0.9" stroke-dasharray="4 4" opacity="0.85"/>
  <rect x="${W - 58}" y="${(lyN - 9).toFixed(1)}" width="56" height="15" rx="4" fill="var(--gold)"/>
  <text x="${W - 30}" y="${(lyN + 2).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="800" fill="#141002" font-family="var(--mono)">${fmt(lastC.c)}</text>
  <line x1="0" y1="${PH + GAP}" x2="${W}" y2="${PH + GAP}" stroke="var(--line2)"/></svg>`;
}

/* ============ AMM router (real reserves, real fees, hub routing) ============ */
function poolFor(a, b) { return pools().find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a)) || null; }
function legQuote(p, a, amtIn) {
  const fwd = p.a === a; const ra = fwd ? p.ra : p.rb, rb = fwd ? p.rb : p.ra;
  const fee = (p.feeBps || 30) / 1e4;
  const ai = amtIn * (1 - fee); const out = rb * ai / (ra + ai);
  const mid = rb / ra, exec = amtIn > 0 ? out / amtIn : mid;
  return { out, mid, exec, impact: mid > 0 ? 1 - exec / mid : 0, feeBps: p.feeBps || 30, k: p.k };
}
function routeQuote(a, b, amtIn) {
  amtIn = Number(amtIn || 0); if (!(amtIn > 0) || a === b) return null;
  const d = poolFor(a, b);
  if (d) { const q = legQuote(d, a, amtIn); return { legs: [q], route: [a, b], out: q.out, impact: q.impact, feeBps: q.feeBps }; }
  const p1 = poolFor(a, "USDS"), p2 = poolFor("USDS", b);
  if (p1 && p2) {
    const q1 = legQuote(p1, a, amtIn); const q2 = legQuote(p2, "USDS", q1.out);
    const impact = (1 + q1.impact) * (1 + q2.impact) - 1;
    return { legs: [q1, q2], route: [a, "USDS", b], out: q2.out, impact, feeBps: (q1.feeBps + q2.feeBps) };
  }
  return null;
}
function tokenUniverse() {
  const s = new Set(); pools().forEach(p => { s.add(p.a); s.add(p.b); });
  markets().forEach(m => { const [a, b] = m.key.split("/"); s.add(a); s.add(b); });
  Object.keys(stt().assets || {}).forEach(a => s.add(a));
  return Array.from(s).filter(Boolean).sort();
}

/* ============ VIEW: trade terminal ============ */
function vTrade() {
  const m = findMarket(T.pair), s = stt();
  if (!m || !m.key) return `<div class="view"><div class="card glow" style="text-align:center;padding:40px">
    <div class="h1">מסוף-מסחר</div><div class="sub">ספר-המנוע עוד-לא-נטען (גיבוי-מוטמע בלי שווקים).</div>
    <button class="btn gold" data-act="reload-dex" style="margin-top:14px">טען-מחדש מהספרים-החיים</button></div></div>`;
  const s24 = m.stats24 || {};
  const chg = (s24.chg24Bps || 0);
  const lastPx = s24.last || m.fair || m.refPrice;
  const asks = bookRows(m, "ask"), bids = bookRows(m, "bid");
  const cs = makeCandles(m, s, T.tf);
  const assets = tokenUniverse();
  const w = (walletsB().find(x => x.name === "treasury") || { balances: {} }).balances || {};
  const live = ordersB().filter(o => (o.base + "/" + o.quote) === m.key).slice(0, 40);
  const lev = T.tick.side === "buy" ? (m.bestAsk || m.fair) : (m.bestBid || m.fair);
  const TICKQ = T.tick.side === "buy" ? m.quote : m.base;
  return `<div class="view"><div class="tg">
  <div class="tg-head">
    <div class="tg-pair">${esc(m.key)} <span class="px">${fmt(lastPx)}</span>
      <span class="chg ${chg >= 0 ? "up" : "dn"}">${chg >= 0 ? "+" : ""}${chg.toFixed(0)} bps · 24h</span></div>
    <div class="tg-stat"><b>${fmt(s24.high24 || 0)}</b><span>נמוך/גבוה 24h: ${fmt(s24.low24 || 0)}</span></div>
    <div class="tg-stat"><b>${mu(s24.vol24QuoteMu || 0)}</b><span>ווליום-24h (USDS)</span></div>
    <div class="tg-stat"><b>${fmti(s24.trades24 || 0)}</b><span>עסקאות-24h</span></div>
    <div class="tg-stat"><b>${(m.spreadBps || 0).toFixed(0)} bps</b><span>ספרד</span></div>
    <div class="tg-stat"><b>${fmti(s.height || 0)}</b><span>גובה · חותם ${AGO(sealB().at)}</span></div>
    <span class="spacer"></span>
    <div class="tg-pairsel">${markets().map(x => `<button data-act="pair" data-k="${esc(x.key)}" class="${x.key === m.key ? "on" : ""}">${esc(x.key)}</button>`).join("")}</div>
  </div>
  <div class="tg-grid">
    <div class="tg-panel"><div class="ph">ספר-הזמנות <small>אמיתי · עומק-מנוע</small></div>
      <div class="pb book">
        ${asks.slice().reverse().map(r => `<div class="brow ask"><span class="bar" style="width:${r.pct.toFixed(0)}%"></span><span class="p">${fmt(r.p)}</span><span class="q">${fmt(r.t)}</span><span class="o">${r.o}</span></div>`).join("") || `<div class="note">אין-הצעות-מכירה-חיות.</div>`}
        <div class="spread"><span>מיד ${fmt(m.fair || 0)} <small>· אמצע-בריכה ${fmt(m.poolMid || 0)}</small></span><span>ספרד ${(m.spreadBps || 0).toFixed(0)}bps</span></div>
        ${bids.map(r => `<div class="brow bid"><span class="bar" style="width:${r.pct.toFixed(0)}%"></span><span class="p">${fmt(r.p)}</span><span class="q">${fmt(r.t)}</span><span class="o">${r.o}</span></div>`).join("") || `<div class="note">אין-הצעות-קנייה-חיות.</div>`}
        <div class="cfoot">מחיר/כמות/הזמנות ביחידות-מנוע גולמיות · עוגן ${usdRef(m.base) != null ? fmt(usdRef(m.base)) + " USDS" : "—"} · מקור: state.json חי</div>
      </div>
      <div class="ph" style="border-top:1px solid var(--line)">נרות <small>מסגרת-אמת: high/low/last</small></div>
      <div class="tfchips" style="padding:7px 10px 0">${[[24, "24×1h"], [48, "48×30m"], [96, "96×15m"]].map(x => `<button data-act="tf" data-k="${x[0]}" class="${T.tf === x[0] ? "on" : ""}">${x[1]}</button>`).join("")}</div>
      <div class="cwrap" id="cwrap">${candleSvg(cs)}
        <div class="ctip" id="ctip"></div></div>
      <div class="cfoot"><b>כנות:</b> המסגרת (גבוה/נמוך/סגירה/עוגן) — אמת-מהמנוע · הנתיב-בין-הנרות שחזור-דטרמיניסטי (seed=stateRoot) · המנוע מחזיק ${fmti((s24.candles1m || 0))} נרות-דקה שטרם-מפורסמים.</div>
    </div>
    <div class="tg-panel"><div class="ph">הזמנות-חיות בספר <small>${fmti(live.length)} מתוך ${fmti(ordersB().length)} בכל-השווקים</small></div>
      <div class="scroll" style="max-height:266px;overflow-y:auto"><table class="otbl"><thead><tr><th>#</th><th>בעלים</th><th>צד</th><th>מחיר</th><th>כמות</th><th>מולא</th></tr></thead><tbody>
      ${live.map(o => `<tr><td>${o.seq || o.id}</td><td class="own">${esc(o.owner)}</td><td class="${o.side === "buy" ? "side-b" : "side-s"}">${o.side === "buy" ? "קנייה" : "מכירה"}</td><td>${fmt(o.price)}</td><td>${fmt(o.amount)}</td><td>${o.amount ? ((o.filled || 0) / o.amount * 100).toFixed(1) + "%" : "—"}</td></tr>`).join("") || `<tr><td colspan="6" class="note">אין-הזמנות-חיות-בזוג זה.</td></tr>`}
      </tbody></table></div>
      <div class="ph" style="border-top:1px solid var(--line)">כוונות-מסחר <small>מקומי · לא-על-השרשרת</small></div>
      <div class="pb" id="intents">${INTENTS.length ? INTENTS.map((it, i) => `<div class="intent"><span class="k">${esc(it.txt)}</span><small>${it.at}</small><button data-act="rm-intent" data-k="${i}">הסר</button></div>`).join("") : `<div class="note">אין-כוונות. שלח-מהכרטיס או מההחלפה.</div>`}</div>
    </div>
    <div class="tg">
      <div class="tg-panel swap"><div class="ph">החלפה מיידית <small>AMM אמת · נתיב-מרכז USDS</small></div>
        <div class="pb">
          <div class="fld"><label>משלם <b>יתרה: ${uBook(w[T.swap.from] || 0)}</b></label>
            <div class="amtbox"><input data-in="swap-amt" type="number" min="0" inputmode="decimal" placeholder="0.0" value="${esc(T.swap.amt)}" aria-label="כמות-מקור">
            <select data-in="swap-from" class="amtsel" aria-label="מטבע-מקור">${assets.map(a => `<option ${a === T.swap.from ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div></div>
          <div class="flip"><button data-act="swap-flip" aria-label="החלף-כיוון">⇅</button></div>
          <div class="fld"><label>מקבל (משוער) <b></b></label>
            <div class="amtbox"><input type="text" readonly value="${esc(T.swap.to)}" aria-label="מטבע-יעד" style="opacity:.5">
            <select data-in="swap-to" class="amtsel" aria-label="מטבע-יעד">${assets.map(a => `<option ${a === T.swap.to ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></div></div>
          <div id="swapq">${swapQuoteHtml()}</div>
          <div class="fld" style="margin-top:8px"><label>החלקה-מרבית</label>
            <div class="slips">${[0.1, 0.5, 1, 3].map(v => `<button data-act="slip" data-k="${v}" class="${T.slip === v ? "on" : ""}">${v}%</button>`).join("")}</div></div>
          <button class="btn gold" data-act="swap-go" style="width:100%;margin-top:10px">החלף ${esc(T.swap.from)} ← ${esc(T.swap.to)}</button>
          <div class="honest" style="margin-top:9px"><b>כנות:</b> ציטוט = מתמטיקת x·y=k על יתרות-בריכה אמיתיות מהספר-החי (עמלה אמיתית bps) · ביצוע = כוונת-בעלים (מחברת-להוראות-המנוע). אין-המצאה.</div>
        </div></div>
      <div class="tg-panel"><div class="ph">כרטיס-הזמנה <small>limit / market</small></div>
        <div class="pb">
          <div class="side-tabs"><button data-act="side" data-k="buy" class="buy ${T.tick.side === "buy" ? "on" : ""}">קנייה ${esc(m.base)}</button>
          <button data-act="side" data-k="sell" class="sell ${T.tick.side === "sell" ? "on" : ""}">מכירה ${esc(m.base)}</button></div>
          <div class="typetabs"><button data-act="otype" data-k="limit" class="${T.tick.type === "limit" ? "on" : ""}">Limit</button><button data-act="otype" data-k="market" class="${T.tick.type === "market" ? "on" : ""}">Market</button></div>
          ${T.tick.type === "limit" ? `<div class="fld"><label>מחיר (${esc(m.quote)}) <b>מיטבי: ${fmt(lev)}</b></label>
            <div class="amtbox"><input data-in="tick-px" type="number" min="0" placeholder="0" value="${esc(T.tick.px)}" aria-label="מחיר"></div></div>` : ""}
          <div class="fld"><label>כמות (${esc(m.base)}) <b>יתרה: ${uBook(w[TICKQ] || 0)}</b></label>
            <div class="amtbox"><input data-in="tick-qty" type="number" min="0" placeholder="0.0" value="${esc(T.tick.qty)}" aria-label="כמות"></div></div>
          <div id="ticksum">${ticketSummaryHtml(m)}</div>
          <button class="btn gold" data-act="tick-go" style="width:100%;margin-top:10px">שלח-כוונה ${T.tick.side === "buy" ? "לקנייה" : "למכירה"}</button>
        </div></div>
    </div>
  </div></div></div>`;
}
function swapQuoteHtml() {
  const q = routeQuote(T.swap.from, T.swap.to, T.swap.amt);
  if (!q) return `<div class="note">בחר-כמות — הציטוט מחושב-חי על יתרות-הבריכות.</div>`;
  const minOut = q.out * (1 - T.slip / 100);
  const rows = q.legs.map((l, i) => `<div class="qrow"><span>רגל-${i + 1} · עמלה ${l.feeBps}bps</span><b>mid ${fmt(l.mid)}</b></div>`).join("");
  const bad = q.impact * 100 > T.slip;
  return `${rows}
  <div class="qrow"><span>מסלול</span><b>${q.route.map(esc).join(" → ")}</b></div>
  <div class="qrow"><span>מקבל</span><b>${fmt(q.out)} ${esc(T.swap.to)}</b></div>
  <div class="qrow"><span>מינימום-אחרי-החלקה</span><b>${fmt(minOut)} ${esc(T.swap.to)}</b></div>
  <div class="qrow"><span>השפעת-מחיר</span><b class="${q.impact > 0.03 ? "bad" : q.impact > 0.01 ? "warn" : ""}">${(q.impact * 100).toFixed(2)}%</b></div>`;
}
function ticketSummaryHtml(m) {
  const px = T.tick.type === "limit" ? Number(T.tick.px || 0) : (T.tick.side === "buy" ? (m.bestAsk || m.fair || 0) : (m.bestBid || m.fair || 0));
  const qty = Number(T.tick.qty || 0); const tot = px * qty;
  return `<div class="qrow"><span>מחיר-ביצוע ${T.tick.type === "market" ? "(שוק)" : ""}</span><b>${fmt(px)} ${esc(m.quote)}</b></div>
  <div class="qrow"><span>סה"כ</span><b>${fmt(tot)} ${esc(m.quote)}</b></div>
  <div class="qrow"><span>ערך-בעוגן</span><b>${usdRef(m.quote) ? "$" + fmt(tot * usdRef(m.quote)) : "—"}</b></div>`;
}

/* ============ VIEW: pools ============ */
function vPools() {
  const ps = pools();
  const sel = ps[T.poolsel] || ps[0];
  return `<div class="view">
  <div class="row" style="justify-content:space-between;margin-bottom:12px"><div><div class="h1">בריכות-נזילות <span class="gd">ספק-נזילות · עמלות-אמת</span></div>
  <div class="sub">${fmti(ps.length)} בריכות-אמת מהספר-החי · יתרות, k, עמלות-bps, תשואת-LP — הכל מ-Console/dex/state.json.</div></div>${asOf(S.dex.at)}</div>
  <div class="grid g-3" style="align-items:start">
    ${ps.map((p, i) => poolCard(p, i)).join("")}
  </div>
  ${sel ? `<div class="grid g-2" style="margin-top:14px;align-items:start">
    <div class="tg-panel"><div class="ph">מחשבון-נזילות · ${esc(sel.a)}/${esc(sel.b)} <small>x·y=k אמת</small></div><div class="pb" id="poolcalc">${poolCalcHtml(sel)}</div></div>
    <div class="card"><h3>📐 מדד-אובדן-זמני (IL)</h3>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>שינוי-מחיר</th><th>IL מול-HODL</th><th>עמלות-דרושות-לכיסוי</th></tr></thead><tbody>
      ${[[0.25, "25%-עלייה"], [1, "×2"], [3, "×4"]].map(x => { const il = Math.abs(2 * Math.sqrt(1 + x[0]) / (2 + x[0]) - 1); return `<tr><td>${esc(x[1])}</td><td class="num">-${(il * 100).toFixed(2)}%</td><td class="num">${(il * 365 * 100 / Math.max(1, (sel.lpYieldBps || 1) / 100)).toFixed(1)} ימי-עמלות</td></tr>`; }).join("")}
      </tbody></table></div>
      <div class="note" style="margin-top:10px"><b>תשואת-LP-נמדדת:</b> ${((sel.lpYieldBps || 0) / 100).toFixed(2)}% (בריכה) · נתח-PoL ${((sel.polShareBps || 0) / 100).toFixed(0)}% · עמלות-שנצברו-לאוצר ${mu(sel.feeAccruedTreasury || 0)}</div>
      <div class="honest" style="margin-top:9px"><b>כנות:</b> המחשבון מבוסס-יתרות-אמת מהספר; פעולת-הפקדה = כוונת-בעלים למנוע (אין-חתימה-מהדפדפן).</div></div>
  </div>` : ""}
  </div>`;
}
function poolCard(p, i) {
  const on = i === T.poolsel;
  return `<div class="poolcard ${on ? "on" : ""}" data-act="poolsel" data-k="${i}" role="button" tabindex="0" aria-pressed="${on}">
    <h4><span class="tok g">${esc(p.a.slice(0, 2))}</span><span class="tok">${esc(p.b.slice(0, 2))}</span> ${esc(p.a)}/${esc(p.b)} ${p.derived ? '<span class="pill p-vio">מנוע</span>' : ""}</h4>
    <div class="pstat">
      <div><span>מיד</span><b>${fmt(p.mid)}</b></div><div><span>עמלה</span><b>${p.feeBps} bps</b></div>
      <div><span>יתרה-${esc(p.a)}</span><b>${uBook(p.ra)}</b></div><div><span>יתרה-${esc(p.b)}</span><b>${uBook(p.rb)}</b></div>
      <div class="hl"><span>תשואת-LP</span><b>${((p.lpYieldBps || 0) / 100).toFixed(2)}%</b></div><div><span>עמלות-LP</span><b>${mu(p.lpFeesMu || 0)}</b></div>
      <div><span>החלפות</span><b>${fmti(p.swaps || 0)}</b></div><div><span>LP-סך</span><b>${fmt(p.lp)}</b></div>
    </div></div>`;
}
function poolCalcHtml(p) {
  const amt = Number(window.__poolAmt || 0);
  const ra = p.ra || 1, rb = p.rb || 1, lp = p.lp || 1;
  const bAmt = amt > 0 ? amt * rb / ra : 0;
  const mint = amt > 0 ? lp * (amt / (ra + amt)) : 0;
  const share = amt > 0 ? (mint / (lp + mint)) * 100 : 0;
  const w = (walletsB().find(x => x.name === "treasury") || { balances: {} }).balances || {};
  return `<div class="poolcalc">
    <div class="fld swap"><label>כמות ${esc(p.a)} <b>יתרה: ${uBook(w[p.a] || 0)}</b></label>
      <div class="amtbox"><input data-in="pool-amt" type="number" min="0" placeholder="0.0" value="${esc(window.__poolAmt || "")}" aria-label="כמות-הפקדה"></div></div>
    <div class="r"><span>נדרש גם ${esc(p.b)}</span><b>${fmt(bAmt)} ${esc(p.b)}</b></div>
    <div class="r"><span>LP-צפוי-להטביע</span><b>${fmt(mint)}</b></div>
    <div class="r"><span>נתח-בריכה-אחרי</span><b>${share.toFixed(4)}%</b></div>
    <div class="r"><span>עמלות-צפויות (APR)</span><b>${((p.lpYieldBps || 0) / 100).toFixed(2)}%</b></div>
    <div class="r"><span>ערך-הפקדה-בעוגן</span><b>${usdRef(p.b) ? "$" + fmt((amt + bAmt) * usdRef(p.b)) : "—"}</b></div>
    <button class="btn gold" data-act="pool-add" style="width:100%;margin-top:9px">שלח-כוונת-הפקדה</button>
  </div>
  <div class="cfoot" style="padding:8px 2px 0">יחס-הפקדה = יחס-יתרות נוכחי (AMM סטנדרטי) · k=${fmt(p.k)} · בעלים: ${esc(p.owner || "—")}</div>`;
}

/* ============ VIEW: perps ============ */
function perpAssets() {
  const rows = [];
  const o = stt().oracle || {}; const a = stt().assets || {};
  [["BTC", "Bitcoin"], ["ETH", "Ethereum"]].forEach(x => { if (o[x[0]]) rows.push({ sym: x[0], name: x[1], px: o[x[0]].mu / 1e6, cur: "$", src: "אורקל-מדיאנה (חי)" }); });
  [["SAOS", "SAOS-ריבוני"], ["WSTEEM", "Steem-עטוף"], ["WSBD", "SBD-עטוף"]].forEach(x => { const v = usdRef(x[0]); if (v != null) rows.push({ sym: x[0], name: x[1], px: v, cur: "USDS", src: "עוגן-מנוע (חי)" }); });
  if (!rows.length) rows.push({ sym: "BTC", name: "Bitcoin", px: 0, cur: "$", src: "ממתין-לספר" });
  return rows;
}
function vPerps() {
  const as = perpAssets();
  const sel = as.find(x => x.sym === T.perp.asset) || as[0];
  const px = sel.px, lev = T.perp.lev, dir = T.perp.dir === "long" ? 1 : -1;
  const size = Number(T.perp.size || 0);
  const mmr = 0.005;
  const notional = size * px; const margin = lev > 0 ? notional / lev : 0;
  const liq = dir > 0 ? px * (1 - 1 / lev + mmr) : px * (1 + 1 / lev - mmr);
  const o = stt().oracle || {}; const a = stt().assets || {};
  const prem = ((stt().rail || {}).premiums || []).find(p => p.active);
  const fundBps = prem ? Math.max(-75, Math.min(75, (prem.premBps || 0) / 100)) : 10; /* model default 1bp/h when no live premium */
  const fundSrc = prem ? "premBps אמיתי מהמסילה (" + esc(prem.pair) + ")" : "מודל-ברירת-מחדל (אין-פרמיה-חיה)";
  const tgt = Number(window.__perpTgt || px);
  const pnl = size * (tgt - px) * dir; const roe = margin > 0 ? pnl / margin * 100 : 0;
  const distLiq = Math.abs(liq - px) / px * 100;
  return `<div class="view">
  <div class="row" style="justify-content:space-between;margin-bottom:12px"><div><div class="h1">נגזרות · מינוף <span class="gd">פיילוט-מחיר-אמת</span></div>
  <div class="sub">חוזרי-עולה על מחירי-עוגן אמיתיים (אורקל-מדיאנה חי · גובה ${fmti(stt().height || 0)}) · חישוב-ליקווידציה/ROE/Funding אמיתי-מתמטי · ביצוע: פיילוט-מקומי.</div></div>
  <span class="pill p-gold">CLAIM-ONLY · ביצוע-סימולציה</span></div>
  <div class="honest" style="margin-bottom:12px"><b>מסגרת-כנות:</b> מחירי-העוגן — TRUE (מהאורקל-החי) · מיקומי-בעלים — CLAIM-ONLY (מקומי בדפדפן, עד-לסליקת-מנוע) · funding — ${esc(fundSrc)}.</div>
  <div class="tg-grid" style="grid-template-columns:1fr 330px">
    <div class="tg">
      <div class="tg-panel"><div class="ph">נכסים <small>מחיר-עוגן חי</small></div><div class="pb perp-asset">
        ${as.map(x => `<div class="pa ${x.sym === sel.sym ? "on" : ""}" data-act="perp-asset" data-k="${esc(x.sym)}" role="button" tabindex="0"><b>${esc(x.sym)}</b> <small>${esc(x.name)}</small><div class="pp">${x.cur === "$" ? "$" : ""}${fmt(x.px)}${x.cur === "USDS" ? " USDS" : ""}</div><small>${esc(x.src)}</small></div>`).join("")}
      </div></div>
      <div class="tg-panel"><div class="ph">סימולטור-עמדה · ${esc(sel.sym)} <small>mark ${sel.cur === "$" ? "$" : ""}${fmt(px)}</small></div>
        <div class="pb">
          <div class="grid g-2" style="gap:10px">
            <div class="fld swap"><label>גודל-עמדה (${esc(sel.sym)})</label><div class="amtbox"><input data-in="perp-size" type="number" min="0" placeholder="0.0" value="${esc(T.perp.size)}" aria-label="גודל"></div></div>
            <div class="fld"><label>כיוון</label><div class="side-tabs" style="margin:0"><button data-act="perp-dir" data-k="long" class="buy ${T.perp.dir === "long" ? "on" : ""}">Long ↗</button><button data-act="perp-dir" data-k="short" class="sell ${T.perp.dir === "short" ? "on" : ""}">Short ↘</button></div></div>
          </div>
          <div class="lev"><span style="font-size:11px;color:var(--faint)">מינוף</span>
            <input data-in="perp-lev" type="range" min="1" max="50" step="1" value="${lev}" aria-label="מינוף">
            <span class="lv">×${lev}</span></div>
          <div class="lchips">${[2, 5, 10, 20, 50].map(l => `<button data-act="perp-lev" data-k="${l}" class="${T.perp.lev === l ? "on" : ""}">×${l}</button>`).join("")}</div>
          <div id="perpsum" style="margin-top:10px">${perpSummaryHtml(sel, liq, margin, notional, fundBps, distLiq)}</div>
        </div></div>
      <div class="tg-panel"><div class="ph">PnL-חי <small>גרירת-מחיר-יעד</small></div>
        <div class="pb">
          <div class="lev"><span style="font-size:11px;color:var(--faint)">יעד</span>
            <input data-in="perp-tgt" type="range" min="${(px * 0.5).toFixed(2)}" max="${(px * 1.5).toFixed(2)}" step="${(px / 400).toFixed(4)}" value="${tgt}" aria-label="מחיר-יעד">
            <span class="lv">${fmt(tgt)}</span></div>
          <div id="perppnl"><div class="grid g-3" style="margin-top:8px">
            ${kpi((pnl >= 0 ? "+" : "") + fmt(pnl) + " " + sel.cur, "PnL על-היעד", "מ-mark " + fmt(px), pnl >= 0 ? "ok" : "bad")}
            ${kpi((roe >= 0 ? "+" : "") + roe.toFixed(1) + "%", "ROE על-ביטחונות", "מינוף ×" + lev, roe >= 0 ? "ok" : "bad")}
            ${kpi(fmt(liq), "מחיר-ליקווידציה", "mmr 0.5% · מרחק " + distLiq.toFixed(1) + "%", "am")}
          </div></div>
        </div></div>
    </div>
    <div class="tg-panel"><div class="ph">עמדות-בעלים <small>מקומי · נשמר-בדפדפן</small></div>
      <div class="pb">
        <button class="btn gold" data-act="perp-open" style="width:100%">פתח-עמדה ${T.perp.dir === "long" ? "Long" : "Short"} ×${lev}</button>
        <div id="perppos">${PERPPOS.length ? PERPPOS.map((p, i) => {
          const mark = (perpAssets().find(x => x.sym === p.sym) || {}).px || p.entry;
          const u = (mark - p.entry) * p.dir * p.size;
          return `<div class="intent"><span><span class="k">${p.dir > 0 ? "↗" : "↘"} ${esc(p.sym)} ×${p.lev}</span><br><small>size ${fmt(p.size)} · entry ${fmt(p.entry)} · mark ${fmt(mark)}</small><br><small style="color:${u >= 0 ? "var(--green)" : "var(--red)"}">uPnL ${u >= 0 ? "+" : ""}${fmt(u)} ${p.cur}</small></span><button data-act="perp-close" data-k="${i}">סגור</button></div>`;
        }).join("") : `<div class="note" style="margin-top:9px">אין-עמדות. פיילוט — נשמר-מקומית-בלבד.</div>`}</div>
        <div class="cfoot"><b>נוסחת-ליקווידציה:</b> long = entry·(1−1/lev+mmr) · short = entry·(1+1/lev−mmr) · <b>funding:</b> clamp(premium, ±75bps) · מקור: ${esc(fundSrc)}</div>
      </div></div>
  </div></div>`;
}
function perpSummaryHtml(sel, liq, margin, notional, fundBps, distLiq) {
  return `<div class="grid g-2" style="gap:8px">
    ${kpi(sel.cur === "$" ? "$" + fmt(notional) : fmt(notional) + " USDS", "שווי-נומינלי", "גודל × mark")}
    ${kpi(sel.cur === "$" ? "$" + fmt(margin) : fmt(margin) + " USDS", "ביטחונות", "נומינלי ÷ מינוף")}
  </div>
  <div class="qrow" style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--dim);padding:6px 2px 2px"><span>ליקווידציה</span><b style="color:var(--red)">${fmt(liq)} (${distLiq.toFixed(1)}%)</b></div>
  <div class="qrow" style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--dim);padding:2px"><span>Funding לשעה</span><b>${(fundBps / 100).toFixed(3)}%</b></div>
  <div class="liqbar" style="margin-top:7px" aria-hidden="true"><i style="width:${Math.max(6, Math.min(94, 100 - distLiq))}%"></i><span></span></div>`;
}

/* ============ delegation wiring (survives re-render) ============ */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const k = el.dataset.k, act = el.dataset.act;
  const m = findMarket(T.pair);
  if (act === "pair") { T.pair = k; }
  else if (act === "tf") { T.tf = Number(k); }
  else if (act === "slip") { T.slip = Number(k); }
  else if (act === "side") { T.tick.side = k; T.tick.px = ""; }
  else if (act === "otype") { T.tick.type = k; }
  else if (act === "swap-flip") { const f = T.swap.from; T.swap.from = T.swap.to; T.swap.to = f; }
  else if (act === "poolsel") { T.poolsel = Number(k); window.__poolAmt = ""; }
  else if (act === "perp-asset") { T.perp.asset = k; }
  else if (act === "perp-dir") { T.perp.dir = k; }
  else if (act === "perp-lev") { T.perp.lev = Number(k); }
  else if (act === "reload-dex") { toast("מביא-ספרים-חיים…", "ok"); loadDex().then(() => route()).catch(() => toast("כשל-הבאה — גיבוי-מוטמע", "err")); return; }
  else if (act === "swap-go") {
    if (!Number(T.swap.amt > 0)) { toast("הזן-כמות", "err"); return; }
    INTENTS.unshift({ txt: "SWAP " + T.swap.amt + " " + T.swap.from + "→" + T.swap.to + " · minSlip " + T.slip + "%", at: new Date().toISOString().slice(11, 19) + "Z" });
    toast("כוונת-החלפה-נרשמה (מקומי) — לביצוע-דרך-מנוע-הבעלים", "ok");
  }
  else if (act === "tick-go") {
    if (!Number(T.tick.qty > 0) || (T.tick.type === "limit" && !Number(T.tick.px > 0))) { toast("השלם-מחיר/כמות", "err"); return; }
    INTENTS.unshift({ txt: (T.tick.type === "limit" ? "LIMIT " : "MARKET ") + (T.tick.side === "buy" ? "קנייה " : "מכירה ") + T.tick.qty + " " + (m ? m.base : "") + (T.tick.type === "limit" ? " @ " + T.tick.px : " @ שוק"), at: new Date().toISOString().slice(11, 19) + "Z" });
    toast("כוונת-הזמנה-נרשמה (מקומי)", "ok");
  }
  else if (act === "rm-intent") { INTENTS.splice(Number(k), 1); }
  else if (act === "pool-add") {
    if (!Number(window.__poolAmt > 0)) { toast("הזן-כמות-הפקדה", "err"); return; }
    const p = pools()[T.poolsel]; if (!p) return;
    INTENTS.unshift({ txt: "ADD-LP " + window.__poolAmt + " " + p.a + "+" + fmt(window.__poolAmt * p.rb / p.ra) + " " + p.b, at: new Date().toISOString().slice(11, 19) + "Z" });
    toast("כוונת-נזילות-נרשמה (מקומי)", "ok");
  }
  else if (act === "perp-open") {
    const as = perpAssets(); const sel = as.find(x => x.sym === T.perp.asset) || as[0];
    const size = Number(T.perp.size || 0);
    if (!(size > 0)) { toast("הזן-גודל-עמדה", "err"); return; }
    PERPPOS.unshift({ sym: sel.sym, dir: T.perp.dir === "long" ? 1 : -1, lev: T.perp.lev, size, entry: sel.px, cur: sel.cur, at: Date.now() });
    savePerp(); toast("עמדת-פיילוט-נפתחה (CLAIM-ONLY)", "ok");
  }
  else if (act === "perp-close") { PERPPOS.splice(Number(k), 1); savePerp(); toast("עמדה-נסגרת", "ok"); }
  else return;
  route();
});
document.addEventListener("input", e => {
  const el = e.target.closest("[data-in]"); if (!el) return;
  const k = el.dataset.in, v = el.value;
  if (k === "swap-amt") { T.swap.amt = v; const q = $("#swapq"); if (q) q.innerHTML = swapQuoteHtml(); }
  else if (k === "swap-from") { T.swap.from = v; route(); }
  else if (k === "swap-to") { T.swap.to = v; route(); }
  else if (k === "tick-px") { T.tick.px = v; const s = $("#ticksum"); if (s && findMarket(T.pair)) s.innerHTML = ticketSummaryHtml(findMarket(T.pair)); }
  else if (k === "tick-qty") { T.tick.qty = v; const s = $("#ticksum"); if (s && findMarket(T.pair)) s.innerHTML = ticketSummaryHtml(findMarket(T.pair)); }
  else if (k === "pool-amt") { window.__poolAmt = v; const c = $("#poolcalc"); const p = pools()[T.poolsel]; if (c && p) c.innerHTML = poolCalcHtml(p); const inp = c && c.querySelector("[data-in=pool-amt]"); if (inp) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e2) { } } }
  else if (k === "perp-size") { T.perp.size = v; }
  else if (k === "perp-lev") { T.perp.lev = Number(v); }
  else if (k === "perp-tgt") { window.__perpTgt = Number(v); }
  else return;
  if (k === "perp-size" || k === "perp-lev" || k === "perp-tgt") { /* live perp recompute without losing slider focus */
    const sel = (perpAssets().find(x => x.sym === T.perp.asset) || perpAssets()[0]);
    const px = sel.px, lev = T.perp.lev, dir = T.perp.dir === "long" ? 1 : -1;
    const size = Number(T.perp.size || 0); const mmr = 0.005;
    const notional = size * px; const margin = lev > 0 ? notional / lev : 0;
    const liq = dir > 0 ? px * (1 - 1 / lev + mmr) : px * (1 + 1 / lev - mmr);
    const fundBps = 10; const tgt = Number(window.__perpTgt || px);
    const pnl = size * (tgt - px) * dir; const roe = margin > 0 ? pnl / margin * 100 : 0;
    const distLiq = Math.abs(liq - px) / px * 100;
    const ps = $("#perpsum"); if (ps) ps.innerHTML = perpSummaryHtml(sel, liq, margin, notional, fundBps, distLiq);
    const pp = $("#perppnl"); if (pp) pp.innerHTML = `<div class="grid g-3">
      ${kpi((pnl >= 0 ? "+" : "") + fmt(pnl) + " " + sel.cur, "PnL על-היעד", "מ-mark " + fmt(px), pnl >= 0 ? "ok" : "bad")}
      ${kpi((roe >= 0 ? "+" : "") + roe.toFixed(1) + "%", "ROE על-ביטחונות", "מינוף ×" + lev, roe >= 0 ? "ok" : "bad")}
      ${kpi(fmt(liq), "מחיר-ליקווידציה", "mmr 0.5% · מרחק " + distLiq.toFixed(1) + "%", "am")}</div>`;
  }
});

/* ============ chart crosshair ============ */
document.addEventListener("mousemove", e => {
  const wrap = e.target && e.target.closest ? e.target.closest(".cwrap") : null;
  const tip = $("#ctip");
  if (!wrap || !tip) { if (tip) tip.style.display = "none"; return; }
  const m = findMarket(T.pair); if (!m) return;
  const rect = wrap.getBoundingClientRect();
  const relX = (e.clientX - rect.left) / rect.width; /* svg direction=ltr */
  const cs = makeCandles(m, stt(), T.tf);
  const idx = Math.max(0, Math.min(cs.length - 1, Math.floor(relX * cs.length)));
  const c = cs[idx];
  tip.style.display = "block";
  tip.style.left = Math.min(rect.width - 150, Math.max(6, relX * rect.width + 10)) + "px";
  tip.style.top = "10px";
  tip.innerHTML = `<span class="${c.c >= c.o ? "g" : "r"}">O ${fmt(c.o)} · C ${fmt(c.c)}</span><br>H ${fmt(c.h)} · L ${fmt(c.l)}<br>vol ${mu(c.v)}`;
});

/* ============ register into v2 router ============ */
(function registerTradeViews() {
  const boot = () => {
    try {
      const iM = NAV.findIndex(n => n.id === "markets");
      if (iM >= 0 && !NAV.some(n => n.id === "trade")) NAV.splice(iM + 1, 0, { id: "trade", ic: "dex", label: "מסוף-מסחר · ספר-הזמנות", tag: "PRO" });
      const iE = NAV.findIndex(n => n.id === "earn");
      if (iE >= 0 && !NAV.some(n => n.id === "pools")) NAV.splice(iE + 1, 0, { id: "pools", ic: "coins", label: "בריכות · נזילות" }, { id: "perps", ic: "engine", label: "נגזרות · מינוף", tag: "PILOT" });
      Object.assign(VIEWS, { trade: vTrade, pools: vPools, perps: vPerps });
      const hash = () => { const id = (location.hash || "").replace(/^#\//, "").split("/")[0]; if (["trade", "pools", "perps"].includes(id)) { const f = $("#footstamp"); if (f) f.textContent = "GIANT v3 · R361 · " + new Date().toISOString().slice(0, 16).replace("T", " ") + "Z"; } };
      window.addEventListener("hashchange", () => setTimeout(hash, 30)); setTimeout(hash, 60);
    } catch (e) { /* v2 stays intact */ }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
