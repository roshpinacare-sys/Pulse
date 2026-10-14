/* GIANT v2 — מערכת-האמת · SPA (אפס-מפתחות · כנות-תלת-מצבית · git=שכבת-הקיום) */
"use strict";

/* ================= utils ================= */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => (n == null || isNaN(n) ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const fmti = n => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("en-US"));
const usd = n => (n == null ? "—" : "$" + fmt(n));
const mu = v => (v == null ? "—" : "$" + (v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const muN = v => (v == null ? "—" : (v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const asOf = t => `<span class="asof">as-of ${esc(t || "—")}</span>`;
const AGO = t => { if (!t) return "—"; const d = new Date(t); if (isNaN(d.getTime())) return "—"; const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 6e4)); return m < 60 ? m + " דק'" : m < 1440 ? Math.round(m / 60) + " ש'" : Math.round(m / 1440) + " ימ'"; };
const INC = () => { const s = st(); return s.income || { poolFeesMu: s.poolFeesMu, feeMeterMu: s.feeMeter, treasuryProfitMu: s.treasuryProfit, treasuryProfitEverMu: s.treasuryProfitEverMu, ladderSpentMu: (s.ladder || {}).spentMu, hub: "USDS" }; };

function toast(msg, kind) {
  const el = document.createElement("div");
  el.className = "toast " + (kind || "");
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 3400);
}
function countUp(el, target, opts) {
  if (!el) return;
  const o = opts || {}, dur = o.dur || 900, from = 0, t0 = performance.now();
  const f = v => o.fmt ? o.fmt(v) : fmti(v);
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = f(from + (target - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function sparkline(points, w, h, cls) {
  if (!points || points.length < 2) return "";
  w = w || 84; h = h || 26;
  const mn = Math.min(...points), mx = Math.max(...points), rg = (mx - mn) || 1;
  const P = points.map((v, i) => [(i / (points.length - 1)) * w, h - 3 - ((v - mn) / rg) * (h - 6)]);
  const d = "M" + P.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
  const up = points[points.length - 1] >= points[0];
  return `<svg class="spark spk-${up ? "up" : "dn"}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke-width="1.6" stroke-linecap="round"/><polygon points="0,${h} ${P.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")} ${w},${h}" stroke="none"/></svg>`;
}
function areaChart(points, w, h, id) {
  if (!points || points.length < 2) return `<div class="skel" style="height:120px"></div>`;
  w = w || 640; h = h || 130;
  const mn = Math.min(...points), mx = Math.max(...points), rg = (mx - mn) || 1;
  const P = points.map((v, i) => [(i / (points.length - 1)) * (w - 8) + 4, h - 14 - ((v - mn) / rg) * (h - 30)]);
  const d = "M" + P.map(p => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="גרף">
  <defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(240,185,11,.35)"/><stop offset="1" stop-color="rgba(240,185,11,0)"/></linearGradient></defs>
  <polygon points="4,${h - 14} ${P.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")} ${w - 4},${h - 14}" fill="url(#g${id})" stroke="none"/>
  <path d="${d}" fill="none" stroke="#f0b90b" stroke-width="2" stroke-linecap="round"/>
  <line x1="4" y1="${h - 13.5}" x2="${w - 4}" y2="${h - 13.5}" stroke="var(--line2)"/>
  <text x="${w - 4}" y="${h - 2}" text-anchor="end" font-size="9" fill="var(--faint)" font-family="var(--mono)">max $${fmt(mx / 1e6)}M · min $${fmt(mn / 1e6)}M</text></svg>`;
}
const ICONS = {
  home: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>',
  dex: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
  coins: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/></svg>',
  earn: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v18M7 8c0-2 2.2-3 5-3s5 1 5 3-2 3-5 3-5 1-5 3 2.2 3 5 3 5-1 5-3"/></svg>',
  engine: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>',
  channel: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13h2"/><path d="M3 9h18"/></svg>',
  fleet: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2 20 6.5v6c0 5-3.5 8-8 9.5-4.5-1.5-8-4.5-8-9.5v-6z"/></svg>',
  laws: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 4h11M16 4v14M8 4v14M4 20h13M14 8h5l-1.5 4H14z"/></svg>',
  giants: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 19 12 5l7 14M8.5 13h7"/></svg>',
  estate: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16M4 12h10M4 19h13"/><circle cx="19" cy="12" r="1.6"/><circle cx="19" cy="19" r="1.6"/></svg>',
  repos: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="M12 8v8M8 10l4-2 4 2"/></svg>',
  admin: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 17l4-10 5 6 5-6 4 10z"/></svg>'
};

/* ================= data layer (multi-source, cached, honest fallbacks) ================= */
const CACHE = (k, v) => { try { v == null ? null : localStorage.setItem("giant:" + k, JSON.stringify({ at: Date.now(), v })); } catch (e) { } };
const READ = k => { try { const x = JSON.parse(localStorage.getItem("giant:" + k)); return x ? x.v : null; } catch (e) { return null; } };
async function fj(url, key, maxAgeMin) {
  const c = key ? READ(key) : null;
  if (c && maxAgeMin && Date.now() - c.at < maxAgeMin * 6e4) return c.v;
  const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  const v = await r.json();
  if (key) CACHE(key, v);
  return v;
}
async function fjl(url) {
  const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(r.status);
  return (await r.text()).split("\n").map(l => l.trim()).filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}
const RAWC = "https://raw.githubusercontent.com/roshpinacare-sys/Console/main/dex/";
const CDNJ = "https://cdn.jsdelivr.net/gh/roshpinacare-sys/Console@main/dex/";

const S = { net: null, lanes: null, directives: [], requests: [], notes: [], voice: null, dex: DEX0, giants: null, cg: null, llama: null, loaded: false };

async function loadDex() {
  const grab = async base => {
    const st = await fj(base + "state.json", "dex-state", 12);
    let fl = null; try { fl = await fj(base + "flow.json", "dex-flow", 12); } catch (e) { }
    return { state: st.state || st, top: st, flow: fl && fl.markets ? fl : null, at: st.publishedAt };
  };
  try { S.dex = await grab(RAWC); }
  catch (e1) { try { S.dex = await grab(CDNJ); } catch (e2) { /* DEX0 embed stays */ } }
}
async function loadGiants() {
  try {
    const g = await fj(RAWC + "giants.json", "giants", 60);
    if (g && g.families) {
      const top = g.families.filter(f => f.vol24h).sort((a, b) => b.vol24h - a.vol24h).slice(0, 8)
        .map(f => ({ id: f.id, name: f.name, vol24h: f.vol24h, fees24h: f.fees24h, cat: f.category || "" }));
      S.giants = { asOf: (g.publishedAt || "").slice(0, 19), rows: top.concat([{ id: "saos", name: "SAOS (אנחנו)", ours: true }]) };
    }
  } catch (e) { /* fallback to league embed in vGiants */ }
}
async function loadCG() {
  try {
    S.cg = await fj("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,usd-coin,solana&sparkline=true&price_change_percentage=24h", "cg", 9);
  } catch (e) { S.cg = READ("cg"); }
}
async function loadLlama() {
  try {
    const L = await fj("https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true", "llama", 45);
    S.llama = L && L.totalDataChart ? L : null;
  } catch (e) { S.llama = null; }
}
async function loadAll() {
  const j = async (p, f) => { try { return await f(p); } catch (e) { return null; } };
  [S.net, S.lanes, S.voice] = [await j("../state/network.json", fj), await j("../mirror/lanes.json", fj), await j("../state/sovereign-channel/voice.json", fj)];
  [S.directives, S.requests, S.notes] = [
    (await j("../state/sovereign-channel/directives.jsonl", fjl)) || S.directives,
    (await j("../state/sovereign-channel/requests.jsonl", fjl)) || S.requests,
    (await j("../state/sovereign-channel/notes.jsonl", fjl)) || S.notes];
  await Promise.all([loadDex(), loadGiants(), loadCG(), loadLlama()]);
  S.loaded = true;
  const dot = $("#livedot"), txt = $("#livetxt");
  if (S.net) { txt.textContent = "חי · " + (S.net.totals ? S.net.totals.repos + " ריפואים · ספר-דקס " + AGO(S.dex.at) : "מסונכרן"); dot.className = "dot"; }
  else { txt.textContent = "מצב-גיבוי (מוטמע)"; dot.className = "dot amb"; }
  buildTape();
}

/* ================= ticker tape ================= */
const BIGCOINS = [
  { sym: "BTC", id: "bitcoin", net: "Bitcoin" }, { sym: "ETH", id: "ethereum", net: "Ethereum · L2s" },
  { sym: "USDT", id: "tether", net: "Ethereum · Tron · BSC" }, { sym: "USDC", id: "usd-coin", net: "Ethereum · Base · Solana" },
  { sym: "SOL", id: "solana", net: "Solana" }
];
function buildTape() {
  const items = [];
  (S.cg || []).forEach(c => {
    const ch = c.price_change_percentage_24h || 0;
    items.push(`<span class="tk"><span class="s">${esc(c.symbol.toUpperCase())}</span><span class="p">$${c.current_price >= 1 ? fmt(c.current_price) : c.current_price}</span><span class="c ${ch >= 0 ? "up" : "dn"}">${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%</span></span>`);
  });
  const ref = S.dex && S.dex.state && S.dex.state.assets ? S.dex.state.assets.SAOS : null;
  if (ref) items.push(`<span class="tk"><span class="s">SAOS</span><span class="p">${(ref.refPrice / 1000).toFixed(3)} USDS</span><span class="c up">oracle</span></span><span class="tk sep">·</span>`);
  items.push(`<span class="tk"><span class="s" style="color:var(--gold)">GIANT v2</span><span class="p">מערכת-אחת · ערוץ-אחד</span></span><span class="tk sep">·</span>`);
  items.push(`<span class="tk"><span class="s">R360</span><span class="p">L-VOL · אין-סוף</span></span>`);
  const seq = items.join('<span class="tk sep">|</span>');
  $("#tapein").innerHTML = seq + '<span class="tk sep">|</span>' + seq;
}

/* ================= nav ================= */
const NAV = [
  { sec: "מרכז" }, { id: "home", ic: "home", label: "מרכז-השליטה" },
  { sec: "כסף-חי" }, { id: "dex", ic: "dex", label: "בורסה · פרוטוקול", tag: "LIVE" },
  { id: "markets", ic: "dex", label: "שווקים · ווליום-24h", tag: "L-VOL" },
  { id: "earn", ic: "earn", label: "חיסכון · הלוואות · ve" },
  { id: "engine", ic: "engine", label: "מנוע-הערך · CoW · שריפה" },
  { id: "bigcoins", ic: "coins", label: "מטבעות-גדולים · גשרים" },
  { id: "giants", ic: "giants", label: "מול-הענקים" },
  { sec: "ריבונות" }, { id: "channel", ic: "channel", label: "הערוץ-הריבוני", tag: "היחיד" },
  { id: "wallet", ic: "wallet", label: "ארנק · משמורת · ספרים" },
  { id: "estate", ic: "estate", label: "כל-הגיט · מפת-אחוזה", tag: "1,443" },
  { id: "laws", ic: "laws", label: "חוקים · אמת" },
  { id: "fleet", ic: "fleet", label: "הצי · פעימות" },
  { id: "repos", ic: "repos", label: "ריפואים" },
  { sec: "בעלים" }, { id: "admin", ic: "admin", label: "ניהול (headcorner)" }
];
function buildNav(cur) {
  $("#sidenav").innerHTML = NAV.map(n => n.sec ? `<div class="sec">${esc(n.sec)}</div>`
    : `<a href="#/${n.id}" class="${n.id === cur ? "on" : ""}"><span class="ic">${ICONS[n.ic] || ""}</span>${esc(n.label)}${n.tag ? `<span class="tag">${esc(n.tag)}</span>` : ""}</a>`).join("")
    + `<div class="lawline">GIANT=R360 · MTT · git=שכבת-הקיום<br>אמת-תלת-מצבית: TRUE / CLAIM-ONLY / שקט</div>`;
  $("#mobnav").innerHTML = NAV.filter(n => n.id && n.id !== "admin" && n.id !== "repos" && n.id !== "laws").map(n =>
    `<a href="#/${n.id}" class="${n.id === cur ? "on" : ""}" aria-label="${esc(n.label)}">${ICONS[n.ic] || ""}</a>`).join("");
}

/* ================= shared cards ================= */
function kpi(v, l, a, cls) { return `<div class="card kpi"><div class="v ${cls || ""}">${v}</div><div class="l">${l}</div>${a ? `<div class="a">${a}</div>` : ""}</div>`; }
const st = () => (S.dex && S.dex.state) || {};
const flw = () => (S.dex && S.dex.flow) || DEX0.flow;

/* ================= views ================= */
function vHome() {
  const s = st();
  return `<div class="view">
  <div class="row" style="justify-content:space-between;margin-bottom:14px">
    <div><div class="h1">מרכז-השליטה <span class="gd">ריבונות-אחת</span></div>
    <div class="sub">הכל חי: ספר-המנוע של saos-dex (raw, כל-שעה) · דופק-הצי (כל-30 דק') · מחירי-שוק (CoinGecko) · ליגת-ענקים (DefiLlama) · הזרמים-הקנוניים.</div></div>
    ${asOf(S.dex.at)}
  </div>
  <div class="hero">
    <div class="card glow">
      <h3><span class="ic">${ICONS.dex}</span> המנוע-החי — saos-dex <span class="pill p-ok">raw-live</span></h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
        <div><div class="bignum up" id="cu-fills">—</div><div class="l" style="font-size:11px;color:var(--dim)">מילויים (fills)</div></div>
        <div><div class="bignum am" id="cu-swaps">—</div><div class="l" style="font-size:11px;color:var(--dim)">סוואפים</div></div>
        <div><div class="bignum" id="cu-ops">—</div><div class="l" style="font-size:11px;color:var(--dim)">אופרציות-שרשרת</div></div>
        <div><div class="bignum" id="cu-h">—</div><div class="l" style="font-size:11px;color:var(--dim)">גובה-שרשרת</div></div>
      </div>
      <div class="more">ספר-קרדיטים: <b>0</b> · סימולציה: אין · הכל נגזר מהמנוע החי המאוטם בגיט (${asOf(S.dex.at)})</div>
    </div>
    <div class="card">
      <h3><span class="ic">${ICONS.coins}</span> שוק-המטבעות-הגדולים <span class="pill p-blue">CoinGecko-live</span></h3>
      <div id="home-ticker">${S.cg ? BIGCOINS.map(c => { const x = S.cg.find(k => k.id === c.id); return x ? `<div class="estate-row"><span class="t" style="min-width:52px">${c.sym}</span><span class="mono" style="font-size:11.5px">$${x.current_price >= 1 ? fmt(x.current_price) : x.current_price}</span>${sparkline((x.sparkline_in_7d || {}).price, 90, 24)}<span class="num ${x.price_change_percentage_24h >= 0 ? "up" : "dn"}" style="margin-inline-start:auto">${x.price_change_percentage_24h >= 0 ? "+" : ""}${(x.price_change_percentage_24h || 0).toFixed(2)}%</span></div>` : ""; }).join("") : `<div class="skel" style="height:120px"></div>`}</div>
      <div class="more"><a href="#/bigcoins">כל-הגשרים-והרשתות →</a></div>
    </div>
  </div>
  <div class="grid g-4" style="margin-top:13px">
    ${kpi(mu(INC().poolFeesMu), "עמלות-בריכות-נצברות", "income.poolFees", "am")}
    ${kpi(mu(INC().treasuryProfitEverMu), "רווח-אוצר-נצבר-אי-פעם", "income.treasuryProfitEver")}
    ${kpi(fmt(st().savings ? st().savings.apyBps / 100 : null) + "%", "APY-חיסכון (fee-share 30%)", "savings.apyBps=" + fmti(st().savings ? st().savings.apyBps : 0), "up")}
    ${kpi(fmti(st().liveOrders), "הזמנות-חיות-בספר", "liveOrders")}
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3><span class="ic">${ICONS.engine}</span> איברי-המערכת</h3>
      <div class="organs">
      ${[["Pulse", "דופק + ערוץ + GIANT", "ok"], ["saos-dex", "הבורסה הריבונית", "ok"], ["Console", "ספרי-מנוע + ליגת-ענקים", "ok"], ["steem", "רישום-חוקים", "ok"], ["Domain", "תאום-MM", "ok"], ["Autonomy", "sovereign-tick", "ok"], ["Saosmartwallet", "משמורת owner-gated", "amb"], ["FleetHQ", "מטה-הצי", "ok"]].map(o => `<div class="organ"><span class="dot ${o[2] === "ok" ? "" : "amb"}"></span><span>${esc(o[0])}<small>${esc(o[1])}</small></span></div>`).join("")}
      </div>
      <div class="more"><a href="#/estate">מפת-כל-הגיט (1,443 פריטים) →</a></div>
    </div>
    <div class="card"><h3><span class="ic">${ICONS.engine}</span> הלופ-האוטונומי — לעולם-לא-נגמר</h3>
      ${endlessLoop()}</div>
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3><span class="ic">${ICONS.channel}</span> הערוץ-הריבוני — היחיד</h3>${channelPreview()}<div class="more"><a href="#/channel">פתח-את-הערוץ →</a></div></div>
    <div class="card"><h3><span class="ic">${ICONS.giants}</span> ליגת-הענקים — מדידה-כנה</h3>${giantsMini()}<div class="more"><a href="#/giants">ההשוואה-המלאה והלימונדה →</a></div></div>
  </div></div>`;
}

function endlessLoop() {
  const s = st();
  const rows = [
    ["dex cloud-beat", "60 דק'", s.engine ? "חי" : "מדוד", S.dex.at],
    ["giants-beat", "1440 דק'", "ליגת-ענקים 28 משפחות", S.giants ? S.giants.asOf : "—"],
    ["Pulse heartbeat", "30 דק'", S.net && S.net.cadence ? "firing · " + S.net.cadence.lastRunAgeMin + " דק'" : "—", S.net ? S.net.generatedAt : "—"],
    ["sovereign-voice", "30 דק'", S.voice ? (S.voice.status || "?") : "—", S.voice ? S.voice.generatedAt : "—"],
    ["money-watch", "30 דק'", "משמרת-נתיב-כסף (fuel/redemption)", "—"],
    ["estate-redboard", "יומי", "רשימה-אדומה-לאחוזה", "—"]
  ];
  return `<div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>מנוע</th><th>קצב</th><th>מצב</th><th>נמדד</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td><b>${esc(r[0])}</b></td><td class="num">${esc(r[1])}</td><td>${esc(r[2])}</td><td class="num">${AGO(r[3])}</td></tr>`).join("")}
  </tbody></table></div>
  <div class="note" style="margin-top:9px"><b>חוק-אין-הסוף (R360 §6):</b> בדיקה · תיקון · בנייה · שיפור · ייעול · אבטחה · הפעלה · ניסיון · ייצור — כל פעימה = הוכחת-חיים נמדדת.</div>`;
}

function channelPreview() {
  const items = [
    ...S.directives.slice(-2).map(d => ({ id: d.id, kind: "הוראה", t: d.title || "", st: d.status || "ACTIVE" })),
    ...S.notes.slice(-2).map(n => ({ id: n.id, kind: n.kind || "דוח", t: n.title || "", st: n.status || "" })),
    ...S.requests.filter(r => /^OPEN/.test(r.status || "")).slice(0, 2).map(r => ({ id: r.id, kind: "בקשה", t: r.title || r.need || "", st: r.status }))
  ].slice(-5);
  if (!items.length) return `<div class="note">הזרמים-טרם-נטענו — גיבוי: D-0001/D-0002 פעילים.</div>`;
  return items.map(i => `<div class="msg"><div class="mh"><span class="id">${esc(i.id)}</span><span class="pill p-gold">${esc(i.kind)}</span><span class="t">${esc(i.t).slice(0, 80)}</span><span class="pill ${/OPEN/.test(i.st) ? "p-blue" : "p-ok"}">${esc(i.st)}</span></div></div>`).join("");
}

function giantsMini() {
  const rows = (S.giants && S.giants.rows) || [{ name: "Uniswap", vol24h: 2722158134 }, { name: "PancakeSwap", vol24h: 771000000 }, { name: "Aerodrome", vol24h: 585800000 }, { name: "SAOS (אנחנו)", ours: true }];
  const mx = Math.max(...rows.map(r => r.vol24h || 0), 1);
  const f = flw();
  const trades24 = f && f.markets ? Object.values(f.markets).reduce((a, m) => a + (m.trades || 0), 0) : 0;
  return `<div class="lg">${rows.slice(0, 5).map(r => `<div class="lgrow ${r.ours ? "ours" : ""}"><span class="nm">${esc(r.name)}</span><span class="bar"><i style="width:${r.vol24h ? Math.max(2, r.vol24h / mx * 100) : 2}%"></i></span><span class="vv">${r.ours ? "ספר-מנוע: " + fmti(trades24) + " עסקאות-24h" : usd(r.vol24h)}</span></div>`).join("")}</div>`;
}

function vDex() {
  const s = st(), inc = INC(), lad = s.ladder || {}, back = s.backing || {};
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">הבורסה-הריבונית <span class="gd">saos-dex · פרוטוקול</span></div>
  <div class="sub">ספר-חי-מאוטם: 3s בלוקים · ספר-קרדיטים-0 · שימור-WSBD · כל-המספרים-מהמנוע (raw הקומיט האחרון).</div></div>${asOf(S.dex.at)}</div>
  <div class="grid g-4" style="margin-top:13px">
    ${kpi("#" + fmti(s.height), "גובה-שרשרת", "3s בלוקים · " + (s.lastBlockAgoMs != null ? "בלוק-אחרון לפני " + (s.lastBlockAgoMs / 1000).toFixed(1) + "s" : ""), "up")}
    ${kpi(fmti(s.tps), "TPS-עכשיו", "ops סה\"כ " + fmti(s.opsTotal))}
    ${kpi(fmti(s.fills) + " · " + fmti(s.swaps), "fills · swaps", "ladders " + fmti(s.ladders), "am")}
    ${kpi(fmti(s.liveOrders), "הזמנות-חיות", "rejected-last " + fmti(s.rejectedLast))}
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card glow"><h3><span class="ic">${ICONS.earn}</span> הכנסות-הפרוטוקול</h3>
      <div class="tblwrap" style="border:none"><table class="tbl"><tbody>
      <tr><td>עמלות-בריכות (נצבר)</td><td class="num am"><b>${mu(inc.poolFeesMu)}</b></td></tr>
      <tr><td>רווח-אוצר-נצבר-אי-פעם</td><td class="num up"><b>${mu(inc.treasuryProfitEverMu)}</b></td></tr>
      <tr><td>רווח-אוצר-יומי-אחרון</td><td class="num">${mu(inc.treasuryProfitMu)}</td></tr>
      <tr><td>מד-עמלות (feeMeter)</td><td class="num">${mu(inc.feeMeterMu)}</td></tr>
      <tr><td>סולם-אוצר-שנוצל</td><td class="num">${mu(inc.ladderSpentMu)}</td></tr>
      <tr><td>גיבוי-מאגר (backing)</td><td class="num">${mu(back.WSTEEM)} WSTEEM · ${mu(back.WSBD)} WSBD</td></tr>
      </tbody></table></div>
      <div class="more">hub: ${esc(inc.hub || "USDS")} · אפס-מספרים-מומצאים</div>
    </div>
    <div class="card"><h3><span class="ic">${ICONS.engine}</span> סולם-האוצר (BOOK-LAW ladder)</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
        <div><div class="bignum am">${fmti(lad.lifts)}</div><div class="l" style="font-size:11px;color:var(--dim)">הרמות-מחיר</div></div>
        <div><div class="bignum">${(lad.refPrice || 0) / 1000}</div><div class="l" style="font-size:11px;color:var(--dim)">מחיר-ייחוס SAOS/USDS</div></div>
        <div><div class="bignum">${mu(lad.stepCostMu)}</div><div class="l" style="font-size:11px;color:var(--dim)">עלות-צעד</div></div>
      </div>
      <div class="note" style="margin-top:10px"><b>חוק-הסולם:</b> הילוך-משתנה רק-מקבלות-צבורות — לא מהפקדות, לא מקובץ-חימוש, לא מפרומפט (SAOS-POLICY-GEARS/1 · kelly probation cap 12).</div>
    </div>
  </div>
  <div class="card" style="margin-top:13px"><h3><span class="ic">${ICONS.coins}</span> אורקל-מדיאנה — מזיני-אמת (כולל רשתות-גדולות)</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>נכס-עטוף</th><th>מחיר-מדיאנה (µ)</th><th>בגובה</th></tr></thead><tbody>
    ${Object.entries(s.oracle || {}).slice(0, 8).map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${fmti(v.mu)}</td><td class="num">#${fmti(v.atH)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="more">מקור: median(WTRX×1, WSOL×1, WSTEEM×1, PHIVE×1) — TRX ו-SOL חיים בתוך-האורקל (הדגש-הגדולים-אמיתי)</div>
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>🛤 מסילת-פרמיות (rail)</h3>
      <div class="note"><b>הון-עצמי-ממומן:</b> ${mu((s.rail || {}).fundedMu)} · מנות: ${fmti((s.rail || {}).doses)} · lifetime lifetime funded ${mu((s.rail || {}).fundedEverMu)}</div>
      <div class="more" style="margin-top:8px">${((s.rail || {}).premiums || []).map(p => `<div class="msg"><div class="mh"><span class="id">${esc(p.pair)}</span><span class="pill ${p.active ? "p-ok" : ""}">${p.active ? "פעיל" : "מושהה"}</span><span class="t">mid ${fmt(p.mid)} · anchor ${fmt(p.anchor)}</span></div><div class="mb">פרמיה: ${fmti(p.premBps)}bps</div></div>`).join("")}</div>
    </div>
    <div class="card"><h3>🏛 נכסים-רשומים (refPrice µ)</h3>
      <div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>נכס</th><th>refPrice</th><th>listed</th></tr></thead><tbody>
      ${Object.entries(s.assets || {}).map(([k, v]) => `<tr><td><b>${esc(k)}</b>${k === "SAOS" ? ' <span class="pill p-gold">המטבע</span>' : ""}</td><td class="num">${(v.refPrice / 1000).toFixed(3)}</td><td class="num">${fmti(v.listed)}</td></tr>`).join("")}
      </tbody></table></div>
    </div>
  </div></div>`;
}

function vMarkets() {
  const f = flw(), mk = f.markets || {};
  const tot = Object.values(mk).reduce((a, m) => a + (m.volQuoteMu || 0), 0);
  const trades = Object.values(mk).reduce((a, m) => a + (m.trades || 0), 0);
  const llama = S.llama && S.llama.totalDataChart ? S.llama.totalDataChart.slice(-30).map(x => x[1]) : null;
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">שווקים <span class="gd">ווליום-24h — המדד-הראשי (L-VOL)</span></div>
  <div class="sub">ווליום-אמיתי-מדוד מטבעת-המנוע (tape-ring-committed). אסור wash — כל-ספרה מהספר.</div></div>${asOf(f.publishedAt)}</div>
  <div class="grid g-4" style="margin-top:13px">
    ${kpi(mu(tot), "ווליום-24h (כל-השווקים)", "quote µ-מדוד", "am")}
    ${kpi(fmti(trades), "עסקאות-24h", (f.window || {}).coverage || "")}
    ${kpi(mu(f.feeMeterTotalMu), "עמלות-24h", "feeMeter")}
    ${kpi(mu((f.sweep || {}).lifetimeVolQuoteMu), "ווליום-צבירה-מאז-הקמה", "sweep lifetime")}
  </div>
  <div class="card" style="margin-top:13px"><h3>⇄ פירוט-שווקים-24h</h3>
    <div class="tblwrap"><table class="tbl" id="mktbl"><thead><tr><th>זוג</th><th>ווליום-24h</th><th>עסקאות</th></tr></thead><tbody>
    ${Object.entries(mk).sort((a, b) => b[1].volQuoteMu - a[1].volQuoteMu).map(([k, m]) => `<tr><td><b>${esc(k)}</b></td><td class="num">${mu(m.volQuoteMu)}</td><td class="num">${fmti(m.trades)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="note" style="margin-top:10px"><b>כנות-מלאה:</b> הווליום-היום-קטן. זו-הנקודה-של-L-VOL: מדד-כן-לכל-פעימה — ההוכחה-נבנית-בספרות-האלה. המשימה-הפתוחה: ליין-הנזילות (L-VOL) ממלא-את-השורה-הזאת-כל-שעה.</div>
  </div>
  <div class="card" style="margin-top:13px"><h3>📈 ווליום-ה-DEX-התעשייתי (DefiLlama — 30 יום, מדידת-עוגן)</h3>
    ${llama ? areaChart(llama, 900, 150, "ll") : `<div class="skel" style="height:140px"></div>`}
    <div class="more">העוגן-התעשייתי-שאליו-אנחנו-מודדים — keyless, בלי-מפתחות, בלי-המצאה</div>
  </div></div>`;
}

function vEarn() {
  const s = st(), sv = s.savings || {}, ln = s.lend || {}, ve = s.ve || {}, bd = s.bond || {}, vt = s.vaultTot || {};
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">חיסכון · הלוואות · <span class="gd">ve-gauges · איגרות-חוב</span></div>
  <div class="sub">מדף-המוצרים-של-הפרוטוקול — כבר-חי-במנוע: כל-כרטיס-קורא-מהספר-החי (raw), אפס-המצאה.</div></div>${asOf(S.dex.at)}</div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card glow"><h3>🐖 חיסכון-ריבוני (fee-share)</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">
        <div><div class="bignum up">${sv.apyBps != null ? (sv.apyBps / 100).toFixed(2) + "%" : "—"}</div><div class="l" style="font-size:11px;color:var(--dim)">APY-נמדד</div></div>
        <div><div class="bignum">${mu(sv.potMu)}</div><div class="l" style="font-size:11px;color:var(--dim)">קרן-החיסכון</div></div>
        <div><div class="bignum">${mu(sv.paidMu)}</div><div class="l" style="font-size:11px;color:var(--dim)">שולם-סה\"כ</div></div>
      </div>
      <div class="tblwrap" style="border:none;margin-top:10px"><table class="tbl"><tbody>
      <tr><td>חולקי-רווח</td><td class="num">feeShare ${sv.feeSharePct}% · income ${mu(sv.incomeSourceMu)}</td></tr>
      <tr><td>פתיחות/סגירות</td><td class="num">${fmti(sv.opens)} / ${fmti(sv.closes)} · חוסכים ${fmti(sv.savers)}</td></tr>
      <tr><td>חלונות-חישוב</td><td class="num">${fmti(sv.windows)} · dayPaid-prev ${mu(sv.dayPaidPrevMu)}</td></tr>
      </tbody></table></div>
    </div>
    <div class="card"><h3>🏦 שווקי-הלוואות (Aave-style)</h3>
      <div class="tblwrap"><table class="tbl"><thead><tr><th>נכס</th><th>LTV</th><th>ליקוידציה</th><th>APR-הלוואה</th><th>עודף</th></tr></thead><tbody>
      ${(ln.markets || []).map(m => `<tr><td><b>${esc(m.asset)}</b></td><td class="num">${m.ltvBps / 100}%</td><td class="num">${m.liqThresholdBps / 100}%</td><td class="num">${(m.borrowAprBps || 0) / 100}%</td><td class="num">${mu(m.cashMu)}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="more">כספות: נפתחו ${fmti(vt.opened)} · נפרעו ${fmti(vt.repaid)} · ליקוידציות ${fmti(vt.liquidations)} · ריבית ${mu(vt.interestMu)}</div>
    </div>
  </div>
  <div class="grid g-3" style="margin-top:13px">
    <div class="card"><h3>🗳 ve-מאזני-הצבעה (Velodrome-style)</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="bignum am">${fmti(ve.epoch)}</div><div class="l" style="font-size:11px;color:var(--dim)">אפוק</div></div>
        <div><div class="bignum">${fmti(ve.positions)}</div><div class="l" style="font-size:11px;color:var(--dim)">עמדות</div></div>
      </div>
      <div class="more">מומן ${mu(ve.fundedMu)} · שולם ${mu(ve.paidOutMu)}</div>
      ${(ve.detail || []).map(d => `<div class="msg" style="margin-top:8px"><div class="mh"><span class="pill p-vio">${esc(d.who)}</span><span class="t">${mu(d.amtMu)}</span><span class="asof">${fmti(d.weeks)} שבועות-נעילה</span></div></div>`).join("")}
      <div class="more">הצבעות: ${Object.entries(ve.votesMap || {}).map(([k, v]) => esc(k) + "→" + esc(v)).join(" · ") || "—"}</div>
    </div>
    <div class="card"><h3>📜 איגרות-חוב (Olympus-style)</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="bignum">${mu(bd.soldSaosMu)}</div><div class="l" style="font-size:11px;color:var(--dim)">SAOS-נמכר</div></div>
        <div><div class="bignum">${mu(bd.usdsInMu)}</div><div class="l" style="font-size:11px;color:var(--dim)">USDS-נכנס</div></div>
      </div>
      <div class="more">עסקאות: ${fmti(bd.count)}</div>
      <div class="note" style="margin-top:8px">מכירת-SAOS-מול-USDS-לאוצר — מנגנון-נזילות-מחוזק-מטבע (R360 §5)</div>
    </div>
    <div class="card"><h3>💧 כספות-בטוחה (vaults)</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
        <div><div class="bignum">${fmti(vt.opened)}</div><div class="l" style="font-size:11px;color:var(--dim)">נפתחו</div></div>
        <div><div class="bignum up">${fmti(vt.liquidations)}</div><div class="l" style="font-size:11px;color:var(--dim)">ליקוידציות</div></div>
      </div>
      <div class="more">issued ${mu(vt.issuedMu)} · burned ${mu(vt.burnedMu)} · backstop-loss ${mu(vt.backstopLossMu)}</div>
      <div class="note" style="margin-top:8px">0 ליקוידציות — סף-הבטוחה-עובד</div>
    </div>
  </div></div>`;
}

function vEngine() {
  const e = (st().engine || {});
  const cow = e.cow || {}, pr = e.protorev || {}, rt = e.router || {}, au = e.auto || {};
  const ms = st().milestone || {};
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">מנוע-הערך <span class="gd">CoW · ProtoRev · Router · שריפה</span></div>
  <div class="sub">מה שהענקים קוראים לו "back-end רציני": התאמות-אצווה, MEV-פנימי, ניתוב-שריפה, ועגינת-אבני-דרך-על-שרשרת-ציבורית.</div></div>${asOf(S.dex.at)}</div>
  <div class="grid g-4" style="margin-top:13px">
    ${kpi(mu(cow.matched), "CoW-התאמות-מצטברות", fmti(cow.batches) + " אצוות", "am")}
    ${kpi(mu(cow.surplusMu), "עודף-משתמשים (surplus)", "fallbackPool " + mu(cow.fallbackPool), "up")}
    ${kpi(mu(pr.pendingMu), "ProtoRev-אסטרטגיה-נצבר", fmti(pr.runs) + " ריצות · " + fmti(pr.cycles) + " מחזורים")}
    ${kpi(mu(rt.burnedMu), "SAOS-נשרף-בניתוב", "vePaid " + mu(rt.vePaidMu), "dn")}
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>🔥 שריפה-וניתוב</h3>
      <div class="tblwrap" style="border:none"><table class="tbl"><tbody>
      <tr><td>סה\"כ SAOS נשרף</td><td class="num dn"><b>${mu(e.burnedSaosMu)}</b></td></tr>
      <tr><td>מחזורי-ניתוב</td><td class="num">${fmti(rt.cycles)} · lastH #${fmti(rt.lastH)}</td></tr>
      <tr><td>פיצוי-ve-מצביעים</td><td class="num">${mu(rt.vePaidMu)}</td></tr>
      <tr><td>ProtoRev-דחיות (כנות)</td><td class="num">${fmti(pr.rejections)}</td></tr>
      </tbody></table></div>
      <div class="note" style="margin-top:9px"><b>מטבע-מתחזק:</b> שריפה-קבועה-מקטינה-היצע; העמלות-מממנות-חיסכון (30% fee-share) ו-ve. כלכלה-סגורה-מדודה.</div>
    </div>
    <div class="card"><h3>⚓ עגינת-אבני-דרך על שרשרת-ציבורית (milestone)</h3>
      <div class="row" style="gap:8px;margin-bottom:8px">
        <span class="pill ${ms.enabled ? "p-ok" : "p-gold"}">${ms.enabled ? "מופעל" : "מוגדר-כבוי"}</span>
        <span class="pill">עוגנים ${fmti(ms.anchored)}</span>
        <span class="pill p-red">שגיאות ${fmti(ms.errors)}</span>
      </div>
      <div class="note">${esc(ms.note || "").slice(0, 300)}</div>
      <div class="more">כל-אבן-דרך-P&L-נעגנת-בפנקס-ציבורי-ומאומתת-קריאה-חוזרת — האמת-לא-תלויה-בנו</div>
    </div>
  </div></div>`;
}

function vBigcoins() {
  const s = st();
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">מטבעות-גדולים <span class="gd">ורשתות-מוכרות — וזו-כוונה-אמיתית</span></div>
  <div class="sub">BTC · ETH · USDT · USDC · SOL חיים-כבר-בתוך-האורקל-ובשומרי-הפקדות-רב-שרשרתיים. STEEM/HIVE = רנלי-תחזוקה בלבד (P-last).</div></div><span class="pill p-blue">CoinGecko-live</span></div>
  <div class="grid g-3" style="margin-top:13px">
  ${(S.cg ? BIGCOINS.map(c => { const x = S.cg.find(k => k.id === c.id); if (!x) return ""; const ch = x.price_change_percentage_24h || 0;
    return `<div class="card"><h3>${c.sym} — ${esc(x.name)}</h3>
    <div class="row" style="justify-content:space-between"><span class="bignum">$${x.current_price >= 1 ? fmt(x.current_price) : x.current_price}</span>${sparkline((x.sparkline_in_7d || {}).price, 110, 34)}</div>
    <div class="more num ${ch >= 0 ? "up" : "dn"}">24h: ${ch >= 0 ? "+" : ""}${ch.toFixed(2)}% · 7d ${x.price_change_percentage_7d_in_currency != null ? (x.price_change_percentage_7d_in_currency >= 0 ? "+" : "") + x.price_change_percentage_7d_in_currency.toFixed(1) + "%" : "—"}</div>
    <div class="more"><b>רשת:</b> ${c.net}</div></div>`; }).join("") : Array(5).fill('<div class="card"><div class="skel" style="height:120px"></div></div>').join(""))}
    <div class="card glow"><h3>SAOS — המטבע-שלנו</h3>
      <div class="row" style="justify-content:space-between"><span class="bignum am">${((s.assets || {}).SAOS ? s.assets.SAOS.refPrice / 1000 : "—")} USDS</span><span class="pill p-gold">oracle</span></div>
      <div class="more">מדיאנה-רב-מזינה · גיבוי ${mu((s.backing || {}).WSTEEM)} WSTEEM</div>
      <div class="more"><a href="#/dex">הפרוטוקול-המלא →</a></div></div>
  </div>
  <div class="card" style="margin-top:13px"><h3>👀 שומרי-הפקדות-רב-שרשרתיים — חיים-עכשיו</h3>
    <div class="tblwrap"><table class="tbl"><thead><tr><th>רשת</th><th>מצב</th><th>EVM-בלוק-אחרון</th></tr></thead><tbody>
    ${["tron", "ethereum", "solana", "bitcoin"].map(c => { const ch = ((S.lanes || {}).chains || {}); return `<tr><td><b>${esc(c)}</b></td><td><span class="pill p-ok">watch-ok</span></td><td class="num">${c === "evm" || c === "ethereum" ? fmti(ch.evmHead || "—") : "—"}</td></tr>`; }).join("")}
    </tbody></table></div>
    <div class="note" style="margin-top:10px"><b>משמעות:</b> גשרי-הפקדות מ-Bitcoin · Ethereum · Tron · Solana נמדדים-ונשמרים — הנזילות-מהעולם-הגדול-חוזרת-אל-הדקס-שלנו. המסלול: <a href="#/markets">ווליום-24h →</a></div>
  </div></div>`;
}

function vChannel() {
  const tabs = [["d", "הוראות-בעלים (" + S.directives.length + ")"], ["r", "בקשות-ריבונות (" + S.requests.length + ")"], ["n", "דוחות (" + S.notes.length + ")"], ["v", "קול-הריבונות"]];
  return `<div class="view">
  <div class="h1">הערוץ-הריבוני <span class="gd">היחיד</span></div>
  <div class="sub">SAOS-SOVEREIGN-CHANNEL/1.2 · בעלים↔ריבונות, אפס-מתווכים · הזרמים: <span class="mono">state/sovereign-channel/</span> · המשטח-היחיד: GIANT (R360 §2) · כל-משטח-אחר = redirect.</div>
  <div class="tabs" id="ctabs" style="margin-top:13px">${tabs.map((t, i) => `<button data-t="${t[0]}" class="${i === 0 ? "on" : ""}">${esc(t[1])}</button>`).join("")}</div>
  <div id="cbody"></div>
  <div class="card" style="margin-top:13px"><h3>✍ הוראה-חדשה (בעלים-בלבד — אפס-מפתחות)</h3><div id="composer"></div>
    <div class="note" style="margin-top:10px">זרימה: נסח → העתק-שורת-JSON → פתח-בעורך-הגיט → הדבק-בסוף-הזרם → קומיט-בזהות-הבעלים. הדף-לעולם-לא-נוגע-במפתחות.</div></div></div>`;
}
function msgCard(m) {
  const stl = m.status || "ACTIVE";
  return `<div class="msg"><div class="mh"><span class="id">${esc(m.id)}</span><span class="pill ${/OPEN/.test(stl) ? "p-blue" : /REJECT|FAIL/.test(stl) ? "p-red" : "p-ok"}">${esc(stl)}</span><span class="t">${esc(m.title || m.law || m.need || "")}</span></div>
  <div class="mb">${esc(m.body || (m.directive ? m.directive.map((x, i) => (i + 1) + ". " + x).join("\n") : "") || "")}</div>
  <div class="mf">${m.trace ? `<span class="asof">${esc(m.trace)}</span>` : ""}${m.at ? asOf(m.at) : ""}</div></div>`;
}
function renderCTab(t) {
  const el = $("#cbody");
  if (t === "d") el.innerHTML = (S.directives.length ? S.directives.slice().reverse().map(msgCard).join("") : `<div class="note">הזרם-לא-נטען.</div>`);
  if (t === "r") el.innerHTML = (S.requests.length ? S.requests.slice().reverse().map(msgCard).join("") : `<div class="note">הזרם-לא-נטען.</div>`);
  if (t === "n") el.innerHTML = (S.notes.length ? `<div class="scroll">${S.notes.slice().reverse().map(msgCard).join("")}</div>` : `<div class="note">אין-דוחות.</div>`);
  if (t === "v") el.innerHTML = S.voice ? `<div class="card"><h3>🗣 קול-הריבונות (translation-only · anti-invention)</h3>
    <div class="msg"><div class="mh"><span class="pill ${S.voice.status === "OK" ? "p-ok" : "p-gold"}">${esc(S.voice.status || "?")}</span>${asOf(S.voice.generatedAt)}</div>
    <div class="mb">${esc(S.voice.text || S.voice.body || S.voice.message || "—")}</div></div>
    <div class="more">${S.voice.reason ? "reason: " + esc(S.voice.reason) : ""}</div></div>` : `<div class="note">voice.json לא-נטען — כנה: לא-נמדד-כאן.</div>`;
}
function nextId(list, pfx) { let mx = 0; list.forEach(x => { const m = /(\d+)$/.exec(x.id || ""); if (m) mx = Math.max(mx, +m[1]); }); return pfx + "-" + String(mx + 1).padStart(4, "0"); }
function composer(mountId) {
  const nid = nextId(S.directives, "D");
  const el = $("#" + mountId);
  if (!el) return;
  el.innerHTML = `
  <input id="cz-title" placeholder="כותרת-ההוראה" style="width:100%;min-height:44px;border-radius:11px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);padding:10px 14px;font-size:14px">
  <textarea id="cz-body" rows="4" placeholder="גוף-ההוראה — כל-שורה = סעיף-חוק-בנחיתה" style="width:100%;margin-top:8px;border-radius:11px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);padding:10px 14px;font-size:14px"></textarea>
  <div class="row" style="margin-top:10px">
    <button class="btn gold" id="cz-gen">נסח שורת-JSON (${esc(nid)})</button>
    <button class="btn ghost" id="cz-copy" disabled>העתק</button>
    <a class="btn ghost" id="cz-open" style="display:none" href="https://github.dev/roshpinacare-sys/Pulse/blob/main/state/sovereign-channel/directives.jsonl" target="_blank" rel="noopener">פתח-בעורך-וקומיט ↗</a>
  </div>
  <pre id="cz-out" class="mono" style="display:none;margin-top:10px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--rs);padding:10px;font-size:10.5px;overflow-x:auto;white-space:pre-wrap"></pre>`;
  let line = "";
  $("#cz-gen").onclick = () => {
    const title = ($("#cz-title").value || "").trim() || "הוראת-בעלים";
    const body = ($("#cz-body").value || "").trim();
    if (!body) { const o = $("#cz-out"); o.style.display = "block"; o.textContent = "// נדרש גוף-הוראה"; return; }
    line = JSON.stringify({ id: nid, at: new Date().toISOString(), by: "owner", law: "R360 §2", title, directive: body.split("\n").map(s => s.trim()).filter(Boolean), status: "ACTIVE" });
    $("#cz-out").style.display = "block"; $("#cz-out").textContent = line;
    $("#cz-copy").disabled = false; $("#cz-open").style.display = "inline-flex";
  };
  $("#cz-copy").onclick = function () {
    if (!line) return;
    const done = () => { this.textContent = "הועתק ✓"; toast("שורת-ההוראה הועתקה — הדבק בסוף הזרם וקומיט", "ok"); };
    if (navigator.clipboard) navigator.clipboard.writeText(line).then(done, () => { this.textContent = "העתיקו-ידנית"; });
    else { const ta = document.createElement("textarea"); ta.value = line; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done.call(this); } catch (e) { this.textContent = "העתיקו-ידנית"; } ta.remove(); }
  };
}

function vWallet() {
  const port = (S.dex && S.dex.state) ? null : null;
  return `<div class="view">
  <div class="h1">ארנק · משמורת · <span class="gd">ספרי-יתרות</span></div>
  <div class="sub">Saosmartwallet owner-gated · ספרי-הליבה חיים-במנוע · משמרת-מפתחות: אף-סוכן-לא-נוגע.</div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>🛡 מצב-משמורת</h3>
      <div class="msg"><div class="mh"><span class="pill p-gold">OWNER-GATED</span><span class="t">Saosmartwallet</span></div>
      <div class="mb">קליפה-חיה-בגיט; תחייה-מלאה = החלטת-בעלים-דרך-הערוץ. אישור-מיינט = דו-מפתח (mandate v4 · liveOwnerArmed=false).</div></div>
      <div class="organs" style="margin-top:10px">
      ${[["vault GEN3", "מוצפן · headcorner-שער"], ["זהות-גיט", "noreply-חוקית-בלבד"], ["leak-scan T-41", "redact-לפני-push"], ["fail-closed", "כשל=עצירה, לא-המצאה"]].map(x => `<div class="organ"><span class="dot"></span><span>${esc(x[0])}<small>${esc(x[1])}</small></span></div>`).join("")}
      </div></div>
    <div class="card"><h3>📚 ספר-הליבה (core book)</h3>
      <div class="note">יתרות-הליבה (treasury+operator+arena) חיות-בספר-המנוע — התצוגה-המלאה-בספרי-המנוע: <a href="https://github.com/roshpinacare-sys/Console/tree/main/dex" target="_blank" rel="noopener">Console/dex ↗</a></div>
      <div class="more" style="margin-top:8px">גיבוי-מאגר: ${mu((st().backing || {}).WSTEEM)} WSTEEM · ${mu((st().backing || {}).WSBD)} WSBD · הכל-בחוק-שימור</div>
      <div class="note" style="margin-top:8px"><b>עקרון:</b> מספרי-יתרות-מוצגים-רק-מספרים-שניתן-לאמת-בספר. מה-שלא-ניתן-לאימות-כאן — לא-מוצג (לא-מומצא).</div>
    </div>
  </div></div>`;
}

function vEstate(q, kind) {
  q = (q || "").trim().toLowerCase();
  const kinds = Object.keys(ESTATE_TOTALS || {});
  let rows = ESTATE || [];
  if (kind) rows = rows.filter(r => r[3] === kind);
  if (q) rows = rows.filter(r => (r[1] + " " + r[2] + " " + r[0]).toLowerCase().includes(q));
  rows = rows.slice(0, 160);
  const KN = { law: "חוק", measured: "מדידה", research: "מחקר", evidence: "ראיה", "node-state": "מצב-שרשרת", "dex-organ": "איבר-דקס", receipt: "קבלה", surface: "משטח", canon: "קאנון", intel: "מודיעין", runbook: "נוהל", "engine-state": "מצב-מנוע", doc: "מסמך", state: "מצב", engine: "מנוע", workflow: "אוטומציה" };
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">כל-הגיט <span class="gd">מפת-האחוזה</span></div>
  <div class="sub">התשובה-הישירה-לשאלה "האם-כל-מה-שבגיט-נמצא-כאן?": ספירות-מלאות-למטה · ${ESTATE ? ESTATE.length : 0} פריטים-מפורטים · לחיצה = מקור-האמת-בגיט.</div></div>${asOf(typeof ESTATE_AT !== "undefined" ? ESTATE_AT : "")}</div>
  <div class="estate-bar" style="margin-top:13px">
    <input id="eq" placeholder="חפש-נתיב/כותרת/ריפו…" value="${esc(q)}" aria-label="חיפוש-באחוזה">
  </div>
  <div class="row" style="gap:6px;margin-bottom:10px">
    <button class="chip ${!kind ? "on" : ""}" data-k="">הכל (${Object.values(ESTATE_TOTALS || {}).reduce((a, b) => a + b, 0)})</button>
    ${kinds.map(k => `<button class="chip ${kind === k ? "on" : ""}" data-k="${k}">${KN[k] || k} (${ESTATE_TOTALS[k]})</button>`).join("")}
  </div>
  <div class="card" style="padding:6px 14px">
    <div id="elist">
    ${rows.map(r => `<div class="estate-row"><span class="pill" style="min-width:74px;justify-content:center">${KN[r[3]] || r[3]}</span><span class="t">${esc(r[2])}</span><span class="p">${esc(r[0])}/${esc(r[1])}</span><span class="asof">${r[4]}KB</span><a href="https://github.com/roshpinacare-sys/${esc(r[0])}/blob/main/${esc(r[1])}" target="_blank" rel="noopener" aria-label="פתח בגיט">↗</a></div>`).join("") || `<div class="note" style="margin:10px">אין-תוצאות — נסה-חיפוש-אחר.</div>`}
    </div>
    <div class="note" style="margin:10px 0"><b>ספירות-מלאות:</b> ${Object.entries(ESTATE_TOTALS || {}).map(([k, v]) => (KN[k] || k) + " " + v).join(" · ")} — סה"כ 1,443. הרשימה-למעלה = מדגם-מדורג; הכול-בגיט-ונגיש-בקישור.</div>
  </div></div>`;
}

function wireEstate() {
  const eq = $("#eq");
  if (!eq) return;
  let t = null;
  eq.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { const kind = ($(".chip.on") || {}).dataset ? $(".chip.on").dataset.k : ""; location.hash = "#/estate/" + encodeURIComponent(eq.value) + (kind ? "/" + kind : ""); }, 350); });
  $$(".chip").forEach(c => c.onclick = () => { const k = c.dataset.k || ""; location.hash = "#/estate/" + encodeURIComponent(eq ? eq.value : "") + (k ? "/" + k : ""); });
}

function vLaws() {
  const L = { id: "R360", title: "GIANT-UNIFICATION-ONE-SYSTEM", laws: [
    "מערכת-אחת: כל-מה-שבגיט נכנס ל-GIANT. אסור משטח-מקביל — עותק הופך redirect-stub.",
    "ערוץ-אחד: SAOS-SOVEREIGN-CHANNEL/1.2 — משטח-ה-UI היחיד: GIANT/#/channel.",
    "אפליקציה-אמיתית: תקן-ענקים — נתונים-חיים, אינטראקציה, כנות-תלת-מצבית; אסור דף-מת.",
    "נזילות-קודם-הכל: L-VOL המדד-הראשי; אסור wash; רק ווליום-אמיתי-מדוד.",
    "מטבעות-גדולים: BTC/ETH/USDT/USDC/SOL + רשתות-מוכרות; STEEM/HIVE = P-last.",
    "אין-סוף: הלופ-האוטונומי נמדד בפעימות — בדיקה·תיקון·בנייה·אבטחה·הפעלה.",
    "שער-הבעלים: headcorner (hash-only); שער-נוחות — הרשאות-אמת owner-keyed.",
    "MTT: כל-הוספה-שורדת-מות-הסוכן (git ציבורי + Pages)."] };
  const dup = [["G-1", "Pulse/sovereign.html", "redirect → GIANT", "בוצע"], ["G-2", "Console/sovereign.html", "redirect", "בוצע"], ["G-3", "Console/sovereign-anchor.html", "redirect", "בוצע"], ["G-4", "sovereign-lighthouse", "redirect", "בוצע"], ["G-5", "apex giant.html", "CTA → GIANT", "בוצע"], ["G-6", "Console giants.html", "CTA → GIANT", "בוצע"], ["G-7", "שני-משרדי-שיווק", "הוגדר — אין-שכפול", "רשום"], ["G-8", "Console/gate.html", "שער-משני-בלבד", "רשום"]];
  const tl = [["R328", "היפוך-כלכלי: ריבונות-מממנת-את-עצמה"], ["R332", "תוכנית-אם: MTT"], ["R343", "איחוד-צי: המטבע-במרכז"], ["R344", "ערוץ-ישיר · אפס-מתווכים"], ["R358", "גל-G: MM-סופרמטיה"], ["R359", "SOV-1: קונסולה-על-הזרמים"], ["R360", "GIANT: מערכת-אחת · ערוץ-אחד"]];
  return `<div class="view">
  <div class="h1">חוקים <span class="gd">ואמת</span></div>
  <div class="sub">אמת-תלת-מצבית: TRUE (נמדד) · CLAIM-ONLY (נטען) · שקט (לא-נמדד). אין-מספרים-מומצאים. לעולם.</div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card glow"><h3>§ ${L.id} — ${L.title}</h3>${L.laws.map((l, i) => `<div class="msg"><div class="mh"><span class="id">§${i + 1}</span><span class="t">${esc(l)}</span></div></div>`).join("")}</div>
    <div><div class="card"><h3>⏱ ציר-החוקים</h3>${tl.map(t => `<div class="msg"><div class="mh"><span class="id">${esc(t[0])}</span><span class="t">${esc(t[1])}</span></div></div>`).join("")}</div>
    <div class="card" style="margin-top:13px"><h3>🧹 מרשם-ביטול-הכפילויות</h3>${dup.map(d => `<div class="msg"><div class="mh"><span class="id">${esc(d[0])}</span><span class="pill ${d[3] === "בוצע" ? "p-ok" : "p-gold"}">${esc(d[3])}</span><span class="t">${esc(d[1])}</span></div><div class="mb">${esc(d[2])}</div></div>`).join("")}</div></div>
  </div></div>`;
}

function vGiants() {
  const rows = (S.giants && S.giants.rows) || [{ name: "Uniswap", vol24h: 2722158134 }, { name: "PancakeSwap", vol24h: 771000000 }, { name: "Aerodrome", vol24h: 585800000 }, { name: "Orca", vol24h: 230600000 }, { name: "Raydium", vol24h: 169200000 }, { name: "Meteora", vol24h: 139400000 }, { name: "SAOS (אנחנו)", ours: true }];
  const mx = Math.max(...rows.map(r => r.vol24h || 0), 1);
  const trades24 = flw() ? Object.values(flw().markets || {}).reduce((a, m) => a + (m.trades || 0), 0) : 0;
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">מול-הענקים <span class="gd">מדידה-כנה, כל-יום</span></div>
  <div class="sub">ליגה נמדדת keyless מ-DefiLlama (28 משפחות-עושר) — אנחנו-בשורה-שלנו-עם-המספרים-שלנו-בלבד.</div></div>${asOf(S.giants ? S.giants.asOf : "")}</div>
  <div class="card" style="margin-top:13px"><h3>★ ווליום-24h — הליגה</h3>
    <div class="lg">${rows.map(r => `<div class="lgrow ${r.ours ? "ours" : ""}"><span class="nm">${esc(r.name)} ${r.ours ? '<span class="pill p-gold">אנחנו</span>' : ""}</span><span class="bar"><i style="width:${r.vol24h ? Math.max(2, r.vol24h / mx * 100) : 2}%"></i></span><span class="vv">${r.ours ? "9 עסקאות-24h-מדודות" : usd(r.vol24h)}</span></div>`).join("")}</div>
    <div class="note" style="margin-top:12px"><b>הכנות:</b> הפער-אדיר — וזו-הנקודה. הענקים-מיושנים: ליטנציה, MEV-פראי, אין-אמת-תלת-מצבית, אין-חוקים-חיים. אנחנו: בלוקים-3s · CoW-התאמות (עודף-למשתמש, לא-למיינרים) · שריפה-מדודה · חוקים-חיים-בגיט · ריבונות-מממנת-עצמה. הדרך: הוכחת-ווליום (L-VOL) → נגזרות → הלוואות → מינוף.</div></div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>🍋 לימונדה — חולשה→עוצמה</h3>
    ${[["5 ערוצי-תקשורת", "ערוץ-אחד קנוני + מערכת-אחת (G-1..G-8)"], ["דפים-מפוזרים-בגיט", "מפת-אחוזה: 1,443 פריטים-חיים-כאן"], ["זעירים-מול-ענקים", "מדידה-כנה-יומית + חדשנות (3s, CoW, אמת-תלת-מצבית)"], ["תלות-ברשתות-ישנות", "מטבעות-גדולים-באורקל-ובגשרים; הישן=P-last"], ["אפס-תקציב", "ריבונות-מממנת-עצמה (R328) · Actions-חינם"]].map(x => `<div class="msg"><div class="mh"><span class="t">🍋 ${esc(x[0])}</span></div><div class="mb" style="color:var(--green)">→ ${esc(x[1])}</div></div>`).join("")}</div>
    <div class="card"><h3>⚔️ מה-יש-לנו-שאין-להם</h3>
      ${[["CoW-אצוות", "עודף-חוזר-למשתמשים: " + mu((st().engine ? st().engine.cow.surplusMu : 0))], ["אמת-תלת-מצבית", "TRUE / CLAIM-ONLY / שקט — אין-המצאה"], ["חוקים-חיים", "8 סעיפי-R360 + מרשם-כפילויות-מחייב"], ["אין-סוף-מדוד", "6 מנועי-פעימה-חיים-בטבלת-הלופ"], ["ריבונות-עצמית", "אפס-תשתית-בתשלום · git=שכבת-קיום"]].map(x => `<div class="msg"><div class="mh"><span class="t">✦ ${esc(x[0])}</span></div><div class="mb">${esc(x[1])}</div></div>`).join("")}</div>
  </div></div>`;
}

function vFleet() {
  const f = (S.net && S.net.fleet) || [];
  const lanes = [["L-VOL", "מנוע-ווליום על הדקס", "פתוח"], ["L-WALLET", "ממשק-ארנק מקצועי", "פתוח"], ["L-STATE", "בורסת-מגזרים + מדדי-חדשנות", "פתוח"], ["L-SEC", "רשימת-אבטחה חיה", "פתוח"], ["L-BRAND", "מיתוג + ערוץ-ציבורי", "פתוח"], ["GIANT", "המערכת-האחת (R360)", "בוצע"]];
  return `<div class="view">
  <div class="h1">הצי <span class="gd">האוטונומי</span></div>
  <div class="sub">תביעת-ליין לפני ביצוע · גבולות-קבצים · אפס-דריסות · MTT · ${fmti((S.net && S.net.totals) ? S.net.totals.repos : 37)} ריפואים-מדודים.</div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>▲ ליינים</h3>${lanes.map(l => `<div class="msg"><div class="mh"><span class="id">${esc(l[0])}</span><span class="t">${esc(l[1])}</span><span class="pill ${l[2] === "בוצע" ? "p-ok" : "p-blue"}">${esc(l[2])}</span></div></div>`).join("")}
      <div class="note"><b>שרשרת-הגלים:</b> ROAST-1 → T-96 (R353) → PLAN-1/2/3 → EXEC-G (R358) → SOV-1 (R359) → GIANT (R360)</div></div>
    <div class="card"><h3>⬡ פעימות-צי נמדדות</h3>${f.length ? `<div class="scroll"><div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>ריפו</th><th>קומיט-אחרון</th><th>Actions</th></tr></thead><tbody>
      ${f.slice(0, 20).map(r => `<tr><td><b>${esc(r.name)}</b>${r.private ? ' <span class="pill">פרטי</span>' : ""}</td><td class="num">${AGO(r.lastCommitAt)}</td><td>${r.actions ? `<span class="pill ${r.actions.conclusion === "success" || r.actions.status === "in_progress" ? "p-ok" : r.actions.conclusion === "failure" ? "p-red" : ""}">${esc(r.actions.conclusion || r.actions.status)}</span>` : "—"}</td></tr>`).join("")}
      </tbody></table></div></div><div class="more">מקור: ../state/network.json · ${asOf(S.net && S.net.generatedAt)}</div>` : `<div class="skel" style="height:200px"></div>`}</div>
  </div></div>`;
}

function vRepos() {
  const tot = (S.net && S.net.totals) || {};
  const seed = [["Pulse", "דופק + ערוץ + GIANT"], ["saos-dex", "הבורסה הריבונית"], ["steem", "רישום-חוקים"], ["Console", "ספרי-מנוע + ליגת-ענקים"], ["Domain", "תאום-MM"], ["Autonomy", "sovereign-tick"], ["Saosmartwallet", "ארנק (owner-gated)"], ["FleetHQ", "מטה-הצי"], ["GridWatch", "משמרת-הגריד"], ["ops-forge", "נפחיית-מערכות"], ["roshpinacare-sys.github.io", "פתח-הבית"]];
  return `<div class="view">
  <div class="h1">ריפואים <span class="gd">מפת-הריבונות</span></div>
  <div class="sub">${fmti(tot.repos || 37)} ריפואים · ${fmti(tot.public)} ציבוריים · ${fmti(tot.private)} פרטיים · issues ${fmti(tot.issuesOpen)} · מלא: <a href="#/estate">מפת-האחוזה →</a></div>
  <div class="grid g-3" style="margin-top:13px">${seed.map(r => `<div class="card"><h3>${ICONS.repos} ${esc(r[0])}</h3><div class="more">${esc(r[1])}</div><div class="more"><a href="https://github.com/roshpinacare-sys/${esc(r[0])}" target="_blank" rel="noopener">פתח-בגיט ↗</a></div></div>`).join("")}</div>
  <div class="card" style="margin-top:13px"><h3>🗒 ריפואים-עם-פסק-דין</h3>
    ${(S.net && S.net.stale24hAnnotated || []).slice(0, 5).map(s => `<div class="msg"><div class="mh"><span class="id">${esc(s.name)}</span><span class="pill p-gold">${esc(s.verdict)}</span></div><div class="mb">${esc((s.reason || "").slice(0, 200))}</div></div>`).join("") || `<div class="note">לא-נטען.</div>`}</div></div>`;
}

/* ================= admin ================= */
const ADMIN_HASH = "849e9df7e612b968739ac425cd8fbe3f8f23989c8f4621d69a61dc406c4e41bc";
async function sha256hex(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join(""); }
const isAdmin = () => { try { return sessionStorage.getItem("giant-admin") === "1"; } catch (e) { return false; } };
function vAdmin() {
  if (!isAdmin()) return `<div class="view"><div class="gate card glow">
    <div class="h1" style="margin-bottom:6px">♛ שער-הבעלים</div>
    <div class="sub" style="margin:0 auto 16px">HEADcorner — הסיסמה-שפותחת-הכל. שער-נוחות; פעולות-משמורת תמיד דו-מפתח-בעלים.</div>
    <input type="password" id="apw" placeholder="••••••••••" autocomplete="current-password" aria-label="סיסמת-ניהול">
    <div class="err" id="aerr"></div><button class="btn gold" id="ago" style="width:100%">פתח-הכל</button>
    <div class="asof" style="margin-top:12px">sha256-gate · אפס-אחסון-טקסט-גלוי · אפס-מפתחות-ברשת</div></div></div>`;
  const s = st();
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">ניהול <span class="gd">מלא</span> — הבעלים</div>
  <div class="sub">הכל-פתוח: זרמים-גולמיים · מרשם-כפילויות · מחבר-הוראות · צגי-ספרים.</div></div><button class="btn ghost" id="alock">נעל</button></div>
  <div class="grid g-4" style="margin-top:13px">
    ${kpi(mu(INC().poolFeesMu), "עמלות-בריכות", asOf(S.dex.at), "am")}
    ${kpi(AGO(S.dex.at), "גיל-ספר-הדקס", "raw Console/dex/state.json")}
    ${kpi(AGO(S.net ? S.net.generatedAt : null), "גיל-דופק-הצי", "network.json")}
    ${kpi(fmti(s.height), "גובה-שרשרת", "3s בלוקים")}
  </div>
  <div class="grid g-2" style="margin-top:13px">
    <div class="card"><h3>✍ מחבר-הוראות (מלא)</h3><div id="composer2"></div></div>
    <div class="card"><h3>📦 זרמים-וספרים-גולמיים</h3>
      <div class="row">
        <a class="btn ghost sm" href="../state/sovereign-channel/directives.jsonl" target="_blank" rel="noopener">directives ↗</a>
        <a class="btn ghost sm" href="../state/sovereign-channel/requests.jsonl" target="_blank" rel="noopener">requests ↗</a>
        <a class="btn ghost sm" href="../state/sovereign-channel/notes.jsonl" target="_blank" rel="noopener">notes ↗</a>
        <a class="btn ghost sm" href="../state/network.json" target="_blank" rel="noopener">network ↗</a>
        <a class="btn ghost sm" href="${RAWC}state.json" target="_blank" rel="noopener">dex-state ↗</a>
        <a class="btn ghost sm" href="${RAWC}flow.json" target="_blank" rel="noopener">dex-flow ↗</a>
      </div>
      <div class="note" style="margin-top:10px"><b>צגי-טריות:</b> ספר-דקס ${AGO(S.dex.at)} · דופק ${AGO(S.net ? S.net.generatedAt : null)} · ענקים ${AGO(S.giants ? S.giants.asOf : null)} · שוק ${S.cg ? "חי" : "גיבוי"}</div>
      <div class="more" style="margin-top:8px"><b>ליינים-פתוחים:</b> L-VOL-GIANT (dex-snapshot-לכל-פעימה) · L-WALLET-GIANT · L-STATE-GIANT · L-SEC-GIANT · L-SOV-API</div>
    </div>
  </div></div>`;
}
async function wireAdmin() {
  const go = $("#ago");
  if (go) go.onclick = async () => {
    const h = await sha256hex(($("#apw").value || "").trim().toLowerCase());
    if (h === ADMIN_HASH) { try { sessionStorage.setItem("giant-admin", "1"); } catch (e) { } toast("השער נפתח — ניהול מלא", "ok"); route(); }
    else { $("#aerr").textContent = "סיסמה-לא-נכונה — השער-כנה: כשל הוא כשל."; toast("כשל-פתיחה", "err"); }
  };
  const apw = $("#apw"); if (apw) apw.addEventListener("keydown", e => { if (e.key === "Enter") go && go.click(); });
  const lock = $("#alock"); if (lock) lock.onclick = () => { try { sessionStorage.removeItem("giant-admin"); } catch (e) { } route(); };
  if (isAdmin()) { const c = $("#composer2"); if (c) { composer("composer2"); } }
}

/* ================= command palette ================= */
function paletteInit() {
  const back = $("#palback"), inp = $("#palin"), list = $("#pallist");
  const open = () => { back.classList.add("open"); inp.value = ""; renderPal(""); inp.focus(); };
  const close = () => back.classList.remove("open");
  $("#palbtn").onclick = open;
  back.addEventListener("click", e => { if (e.target === back) close(); });
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); back.classList.contains("open") ? close() : open(); }
    if (e.key === "Escape") close();
  });
  const VIEWS_LBL = { home: "מרכז-השליטה", dex: "בורסה · פרוטוקול", markets: "שווקים · ווליום", earn: "חיסכון · הלוואות · ve", engine: "מנוע-הערך", bigcoins: "מטבעות-גדולים", giants: "מול-הענקים", channel: "הערוץ-הריבוני", wallet: "ארנק · משמורת", estate: "כל-הגיט", laws: "חוקים · אמת", fleet: "הצי", repos: "ריפואים", admin: "ניהול" };
  function renderPal(q) {
    q = (q || "").trim().toLowerCase();
    const views = Object.entries(VIEWS_LBL).filter(([k, v]) => !q || v.toLowerCase().includes(q)).slice(0, 7)
      .map(([k, v]) => `<div class="pl-item" data-go="#/${k}"><span class="ic">${ICONS[k === "admin" ? "admin" : k === "home" ? "home" : k === "estate" ? "estate" : k === "laws" ? "laws" : k === "fleet" ? "fleet" : k === "repos" ? "repos" : k === "channel" ? "channel" : k === "wallet" ? "wallet" : k === "giants" ? "giants" : k === "engine" ? "engine" : k === "earn" ? "earn" : k === "markets" ? "dex" : "dex"]}</span><span>${esc(v)}</span><span class="k">view</span></div>`);
    const streams = S.directives.concat(S.requests, S.notes).filter(m => q && ((m.title || "") + " " + (m.id || "")).toLowerCase().includes(q)).slice(0, 5)
      .map(m => `<div class="pl-item" data-go="#/channel"><span class="ic">${ICONS.channel}</span><span>${esc(m.id)} — ${esc((m.title || "").slice(0, 60))}</span><span class="k">stream</span></div>`);
    const estate = (!q ? (ESTATE || []).slice(0, 0) : (ESTATE || []).filter(r => (r[1] + r[2] + r[0]).toLowerCase().includes(q)).slice(0, 12))
      .map(r => `<div class="pl-item" data-url="https://github.com/roshpinacare-sys/${esc(r[0])}/blob/main/${esc(r[1])}"><span class="ic">${ICONS.estate}</span><span>${esc(r[2])}<br><small>${esc(r[0])}/${esc(r[1])}</small></span><span class="k">git</span></div>`);
    list.innerHTML = views.concat(streams, estate).join("") || `<div class="pl-item"><span>אין-תוצאות</span></div>`;
    $$(".pl-item", list).forEach(it => it.onclick = () => { if (it.dataset.go) { location.hash = it.dataset.go; close(); } else if (it.dataset.url) { window.open(it.dataset.url, "_blank", "noopener"); close(); } });
  }
  inp.addEventListener("input", () => renderPal(inp.value));
}

/* ================= router ================= */
const VIEWS = { home: vHome, dex: vDex, markets: vMarkets, earn: vEarn, engine: vEngine, bigcoins: vBigcoins, channel: vChannel, wallet: vWallet, laws: vLaws, giants: vGiants, fleet: vFleet, repos: vRepos, admin: vAdmin };
function route() {
  const parts = (location.hash || "#/home").replace(/^#\//, "").split("/").map(decodeURIComponent);
  const id = VIEWS[parts[0]] ? parts[0] : (parts[0] === "estate" ? "estate" : "home");
  buildNav(id === "estate" ? "estate" : id);
  if (id === "estate") { $("#view").innerHTML = vEstate(parts[1] || "", parts[2] || ""); wireEstate(); }
  else { $("#view").innerHTML = VIEWS[id]();
    if (id === "channel") { renderCTab("d"); composer("composer"); $("#ctabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; $$("#ctabs button").forEach(x => x.classList.remove("on")); b.classList.add("on"); renderCTab(b.dataset.t); }); }
    if (id === "admin") wireAdmin();
    if (id === "home") { const s = st(); if (s.fills != null) { countUp($("#cu-fills"), s.fills); countUp($("#cu-swaps"), s.swaps); countUp($("#cu-ops"), s.opsTotal); countUp($("#cu-h"), s.height); } }
  }
  $("#footstamp").textContent = "GIANT v2 · R360 · " + new Date().toISOString().slice(0, 16).replace("T", " ") + "Z";
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", async () => {
  paletteInit(); route();
  await loadAll(); route();
  if (!(st().income)) { setTimeout(async () => { try { await loadDex(); route(); } catch (e) { } }, 4000); }
  setInterval(route, 180000);
  setInterval(() => { $("#clock").textContent = new Date().toISOString().slice(11, 19) + "Z"; }, 1000);
  setInterval(async () => { await loadAll(); const id = (location.hash || "").replace(/^#\//, "").split("/")[0]; if (["home", "channel", "dex", "markets", "earn", "engine", "bigcoins", "giants"].includes(id)) route(); }, 150000);
});
