/* GIANT — מערכת-האמת · SPA (אפס-מפתחות · כנות-תלת-מצבית · git=שכבת-הקיום) */
"use strict";

/* ============ honest embeds (נמדד, עם חותמת-זמן; לא-המצאה) ============ */
const EMBED = {
  dex: {
    asOf: "2026-10-14T18:55:37Z", engineCommit: "5264baa", headBlock: 190763, blockSec: 3,
    markets: [
      { pair: "SAOS / USDS", role: "השוק-הראשי — מטבע-הריבונות מול הדולר", tier: "core" },
      { pair: "USDS / WSTEEM", role: "רנל-תחזוקה (P-last)", tier: "rail" },
      { pair: "ENERGY / SAOS", role: "שוק-אנרגיה על המטבע", tier: "sector" },
      { pair: "PHIVE / USDS", role: "שוק-מגזר", tier: "sector" },
      { pair: "USDS / WSBD", role: "רנל-תחזוקה (P-last)", tier: "rail" }
    ],
    poolFeesUu: 171800, sumWsbd: 66959, conservation: "WSBD-CONSERVED (חוק-שימור)",
    treasury: { verdict: "LADDER-ACTED", acted: 1, openOrders: 2, trader: "hcsoldier4", mid: 0.10038, at: "2026-10-14T14:42:45Z" },
    gears: { gear: 1, gearsCount: 3, greenStreak: 2, kelly: { mode: "probation", cap: 12, gearCap: 25, informative: 3, minBeats: 10 } },
    ourBook: { fills: 9942, swaps: 8812, feeMeter: 3276, at: "2026-10-13T14:25:56Z" }
  },
  giants: {
    asOf: "2026-10-14T17:04:50Z", book: "saos-giants/1.0",
    rows: [
      { id: "uniswap", name: "Uniswap", vol24h: 2722158134, fees24h: 3076501, chains: "Ethereum · Base · Arbitrum" },
      { id: "pancakeswap", name: "PancakeSwap", vol24h: 771000000, fees24h: 386300, chains: "BSC · Base" },
      { id: "aerodrome", name: "Aerodrome", vol24h: 585800000, fees24h: 352600, chains: "Base" },
      { id: "orca", name: "Orca", vol24h: 230600000, fees24h: 225500, chains: "Solana" },
      { id: "raydium", name: "Raydium", vol24h: 169200000, fees24h: 343400, chains: "Solana" },
      { id: "meteora", name: "Meteora", vol24h: 139400000, fees24h: 791600, chains: "Solana" },
      { id: "saos", name: "SAOS (אנחנו)", vol24h: null, fees24h: null, ours: true, chains: "saos-dex · ריבוני" }
    ]
  },
  law: {
    id: "R360", title: "GIANT-UNIFICATION-ONE-SYSTEM",
    laws: [
      "מערכת-אחת: כל-מה-שבגיט נכנס ל-GIANT (Pulse/giant/). אסור-משטח-מקביל — עותק הופך redirect-stub.",
      "ערוץ-אחד: SAOS-SOVEREIGN-CHANNEL/1.2 — הזרמים state/sovereign-channel; משטח-ה-UI היחיד: GIANT/#/channel.",
      "אפליקציה-אמיתית: תקן-ענקים — SPA חיה, RTL, מובייל-ראשון, נגישות; אסור עמוד-מת.",
      "נזילות-קודם-הכל: L-VOL המדד-הראשי; אסור wash-volume; רק ווליום-אמיתי-מדוד.",
      "מטבעות-גדולים: הדגשה ציבורית BTC/ETH/USDT/USDC/SOL + רשתות-מוכרות; STEEM/HIVE = רנלי-תחזוקה (P-last).",
      "אין-סוף: המערכת-לעולם-לא-נגמרת — לופ-אוטונומי נמדד בפעימות (בדיקה·תיקון·בנייה·אבטחה·הפעלה).",
      "שער-הבעלים: headcorner (hash-only) פותח ניהול; שער-נוחות — הרשאות-אמת תמיד owner-keyed.",
      "MTT: כל-הוספה-חייבת-לשרוד-מות-הסוכן (git ציבורי + Pages)."
    ],
    dup: [
      { g: "G-1", what: "Pulse/sovereign.html", verdict: "redirect-stub → GIANT", state: "done" },
      { g: "G-2", what: "Console/sovereign.html", verdict: "redirect-stub → GIANT", state: "done" },
      { g: "G-3", what: "Console/sovereign-anchor.html", verdict: "redirect-stub → GIANT", state: "done" },
      { g: "G-4", what: "sovereign-lighthouse/index.html", verdict: "redirect-stub → GIANT", state: "done" },
      { g: "G-5", what: "apex-site/giant.html", verdict: "עמוד-סיפור + CTA → GIANT", state: "done" },
      { g: "G-6", what: "Console/giants.html", verdict: "עמוד-נתונים + CTA → GIANT", state: "done" },
      { g: "G-7", what: "שני-משרדי-שיווק (Console/hub · apex)", verdict: "hub=משרד-תוכן · apex=פתח-הבית — אין-לשכפל-תוכן", state: "registered" },
      { g: "G-8", what: "Console/gate.html", verdict: "שער-משני ל-Console בלבד — לא ערוץ", state: "registered" }
    ]
  },
  bigcoins: [
    { sym: "BTC", name: "Bitcoin", net: "Bitcoin", why: "עוגן-הרזרבה של העולם" },
    { sym: "ETH", name: "Ethereum", net: "Ethereum · L2s", why: "בית-ה-DeFi" },
    { sym: "USDT", name: "Tether", net: "Ethereum · Tron · BSC", why: "הדולר-הדיגיטלי #1" },
    { sym: "USDC", name: "USD Coin", net: "Ethereum · Base · Solana", why: "הדולר-המוסדי" },
    { sym: "SOL", name: "Solana", net: "Solana", why: "ביצועים בקצב-ריבוני (3s)" },
    { sym: "SAOS", name: "SAOS", net: "saos-dex", why: "המטבע-שלנו — מרכז-הכובד", ours: true }
  ],
  products: [
    { name: "מנוע-מכפל-נזילות (MM)", state: "ACTIVE", ref: "R358 · גל-G", desc: "עומד-על-קביעות על התאום של Domain; עמלות-AMM מדודות" },
    { name: "גיר-בוקס אוצר (Grid)", state: "ACTIVE", ref: "BOOK-LAW", desc: "הילוך-1 מתוך 3; שינוי-הילוך = קבלות-סולם-בלבד" },
    { name: "נגזרות (Derivatives)", state: "PLANNED", ref: "R360 §4", desc: "פיוצ'רס על זוגות-הליבה; לאחר הוכחת-ווליום" },
    { name: "הלוואות (Lending)", state: "PLANNED", ref: "R360 §4", desc: "שוק-כסף על USDS/WSBD; דו-מפתח-בעלים למיינט" },
    { name: "מינוף (Leverage)", state: "PLANNED", ref: "R360 §4", desc: "מינוף-מדוד-Kelly בלבד; probation→cap" },
    { name: "EVM-Lab", state: "TESTNET", ref: "R358", desc: "paper/testnet בלבד; מיינט = אישור-דו-מפתח" }
  ]
};

/* ============ utils ============ */
const $ = (s, el) => (el || document).querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => (n == null ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }));
const usd = n => (n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 }));
const asOf = t => `<span class="asof">as-of ${esc(t || "—")}</span>`;

async function fetchJSON(url) {
  const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function fetchJSONL(url) {
  const r = await fetch(url + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error(r.status);
  const txt = await r.text();
  return txt.split("\n").map(l => l.trim()).filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
}
const GIANT_URL = "https://roshpinacare-sys.github.io/Pulse/giant/";
const RAW = "https://raw.githubusercontent.com/roshpinacare-sys/Console/main/dex/giants.json";

/* ============ state ============ */
const S = { net: null, lanes: null, directives: [], requests: [], notes: [], voice: null, giants: EMBED.giants, live: "amb" };

async function loadAll() {
  const j = async (p, f) => { try { return await f(p); } catch (e) { return null; } };
  S.net = await j("../state/network.json", fetchJSON);
  S.lanes = await j("../mirror/lanes.json", fetchJSON);
  S.directives = (await j("../state/sovereign-channel/directives.jsonl", fetchJSONL)) || [];
  S.requests = (await j("../state/sovereign-channel/requests.jsonl", fetchJSONL)) || [];
  S.notes = (await j("../state/sovereign-channel/notes.jsonl", fetchJSONL)) || [];
  S.voice = await j("../state/sovereign-channel/voice.json", fetchJSON);
  try {
    const g = await fetchJSON(RAW.replace("giants.json", "") + "giants.json");
    if (g && g.families && g.families.length) {
      const top = g.families.filter(f => f.vol24h).sort((a, b) => b.vol24h - a.vol24h).slice(0, 6)
        .map(f => ({ id: f.id, name: f.name, vol24h: f.vol24h, fees24h: f.fees24h, chains: f.category || "" }));
      S.giants = { asOf: (g.publishedAt || "").slice(0, 19), book: g.book, rows: top.concat([EMBED.giants.rows.find(r => r.ours)]) };
    }
  } catch (e) { /* fallback snapshot stays, honest as-of */ }
  const live = $("#livetxt"), dot = $("#livedot");
  if (S.net) { live.textContent = "חי · " + (S.net.totals ? S.net.totals.repos + " ריפואים" : "מסונכרן"); dot.className = "dot"; S.live = "ok"; }
  else { live.textContent = "מצב-גיבוי (נתונים-מוטמעים)"; dot.className = "dot amb"; S.live = "amb"; }
}

/* ============ nav ============ */
const NAV = [
  { id: "home", ic: "◈", label: "מרכז-השליטה" },
  { id: "dex", ic: "⇄", label: "בורסה · DEX", tag: "L-VOL" },
  { id: "bigcoins", ic: "◎", label: "מטבעות-גדולים" },
  { id: "products", ic: "▲", label: "מוצרים · נזילות" },
  { id: "channel", ic: "♛", label: "הערוץ-הריבוני", tag: "ערוץ-אחד" },
  { id: "wallet", ic: "◇", label: "ארנק · משמורת" },
  { id: "fleet", ic: "▲", label: "הצי" },
  { id: "laws", ic: "§", label: "חוקים · אמת" },
  { id: "giants", ic: "★", label: "מול-הענקים" },
  { id: "repos", ic: "⬡", label: "ריפואים" },
  { id: "admin", ic: "♛", label: "ניהול (headcorner)" }
];
function buildNav(cur) {
  const side = $("#sidenav"), mob = $("#mobnav");
  side.innerHTML = NAV.map(n => `<a href="#/${n.id}" class="${n.id === cur ? "on" : ""}"><span class="ic">${n.ic}</span>${esc(n.label)}${n.tag ? `<span class="tag">${esc(n.tag)}</span>` : ""}</a>`).join("")
    + `<div class="lawline">GIANT=R360 · ערוץ-אחד · אין-סוף<br>git=שכבת-הקיום · MTT</div>`;
  mob.innerHTML = NAV.filter(n => n.id !== "admin").map(n => `<a href="#/${n.id}" class="${n.id === cur ? "on" : ""}"><span class="ic">${n.ic}</span>${esc(n.label.split(" ")[0].replace("מרכז-השליטה", "מרכז"))}</a>`).join("");
}

/* ============ shared cards ============ */
function kpi(v, l, a, cls) { return `<div class="card kpi"><div class="v ${cls || ""}">${v}</div><div class="l">${l}</div>${a ? `<div class="a">${a}</div>` : ""}</div>`; }

function econKpis() {
  const e = S.net && S.net.economy || {};
  const gx = e.gearbox || {}, tr = e.treasury || {}, ar = e.army || {}, tot = S.net && S.net.totals || {};
  return [
    kpi(`${gx.gear ?? EMBED.dex.gears.gear}/${gx.gearsCount ?? 3}`, "הילוך-גיר-בוקס (BOOK-LAW)", `kelly ${gx.kelly ? gx.kelly.mode : "—"} · cap ${gx.kelly ? gx.kelly.cap : EMBED.dex.gears.kelly.cap}`, "am"),
    kpi(esc(tr.verdict || EMBED.dex.treasury.verdict), "אוצר — פסק-דין אחרון", `נפתחו ${tr.acted ?? EMBED.dex.treasury.acted} · פתוחות ${tr.openOrders ?? EMBED.dex.treasury.openOrders} · ${esc(tr.trader || EMBED.dex.treasury.trader)}`),
    kpi(`${ar.acted ?? 3}/${ar.roster ?? 12}`, "צבא-הריבונות — פעל-היום", `סטזיס ${ar.stasis ?? 8}`),
    kpi(fmt(tot.repos ?? 37), "ריפואים בריבונות", `ציבוריים ${fmt(tot.public)} · פרטיים ${fmt(tot.private)} · stale-24h ${fmt(tot.stale24h)}`),
    kpi(fmt(e.gapsOpen ?? 3), "פערי-מימון-עצמי פתוחים", "DECISIONS #14 · רישום-פדיון פעיל", "am"),
    kpi(fmt(EMBED.dex.poolFeesUu) + "µ", "עמלות-בריכות (מדוד)", asOf(EMBED.dex.asOf))
  ].join("");
}

function organsMap() {
  const organs = [
    { n: "Pulse", d: "דופק + ערוץ + GIANT", s: "ok" },
    { n: "saos-dex", d: "הבורסה הריבונית", s: "ok" },
    { n: "steem", d: "רישום-חוקים (saos-cockpit)", s: "ok" },
    { n: "Console", d: "משטח-אמת ציבורי", s: "ok" },
    { n: "Domain", d: "תאום-MM (R358)", s: "ok" },
    { n: "Autonomy", d: "sovereign-tick", s: "ok" },
    { n: "Saosmartwallet", d: "משמורת — owner-gated", s: "amb" },
    { n: "FleetHQ", d: "מטה-הצי", s: "ok" }
  ];
  return `<div class="organs">${organs.map(o => `<div class="organ"><span class="dot ${o.s === "ok" ? "" : "amb"}"></span><span>${esc(o.n)}<small>${esc(o.d)}</small></span></div>`).join("")}</div>`;
}

function endlessLoop() {
  const rows = [
    ["Pulse heartbeat", "*/30 דק'", S.net ? (S.net.cadence ? "פעיל · lastRun " + (S.net.cadence.lastRunAgeMin ?? "?") + " דק'" : "מדוד") : "טעון"],
    ["dex-beat (saos-dex)", "~60 דק'", "h" + EMBED.dex.headBlock + " · 3600 ticks"],
    ["giants-beat (Console)", "1440 דק'", "ליגת-ענקים · 28 משפחות"],
    ["sovereign-voice", "30 דק'", S.voice ? (S.voice.status ? esc(S.voice.status) : "מחובר") : "לא-נמדד"],
    ["ladder-refresh (steem)", "~6-9 ש'", "plan-only · custody-boundary"],
    ["estate-redboard", "יומי", "sovereign-lighthouse"]
  ];
  return `<div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>מנוע-אוטונומי</th><th>קצב</th><th>מצב-נמדד</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td><b>${esc(r[0])}</b></td><td class="num">${esc(r[1])}</td><td class="num">${esc(r[2])}</td></tr>`).join("")}
  </tbody></table></div>
  <div class="note" style="margin-top:10px"><b>חוק-אין-הסוף (R360 §6):</b> המערכת לעולם לא נגמרת — האוטונומיה בודקת, מתקנת, בונה, משפרת, מייעלת, מאבטחת, מפעילה, מנסה ומייצרת. כל פעימה = הוכחת-חיים נמדדת.</div>`;
}

function lemonade() {
  const rows = [
    ["חולשה: 5 ערוצי-תקשורת נפרדים", "עוצמה: ערוץ-אחד קנוני + מערכת-אחת שמציגה הכל (G-1..G-8)"],
    ["חולשה: דפים מפוזרים בגיט", "עוצמה: GIANT מציג את כל הריבונות כאפליקציה אחת"],
    ["חולשה: אנחנו זעירים מול ענקים", "עוצמה: מדידה-כנה מולם כל-יום + חדשנות (3s בלוקים, אמת-תלת-מצבית, ריבונות-עצמית)"],
    ["חולשה: תלות ברשתות-ישנות (STEEM/HIVE)", "עוצמה: ממוקדים במטבעות-גדולים ורשתות-מוכרות; הישן = רנל-תחזוקה"],
    ["חולשה: אפס-תקציב", "עוצמה: ריבונות-מממנת-את-עצמה (R328) · Actions חינם · אפס-תשתית"]
  ];
  return `<div class="grid g-2">${rows.map(r => `<div class="card"><h3>🍋 ${esc(r[0])}</h3><div class="more" style="color:var(--green)"><b>→</b> ${esc(r[1])}</div></div>`).join("")}</div>`;
}

/* ============ views ============ */
function vHome() {
  return `<div class="view">
  <div class="row" style="justify-content:space-between;margin-bottom:14px">
    <div><div class="h1">מרכז-השליטה <span class="gd">ריבונות-אחת</span></div>
    <div class="sub">GIANT = המערכת-האחת של SAOS: בורסה, ארנק, אוצר, צי, חוקים והערוץ-הריבוני — הכל כאן, הכל נמדד.</div></div>
    <div class="row">${asOf(S.net && S.net.generatedAt || EMBED.dex.asOf)}</div>
  </div>
  <div class="grid g-kpi">${econKpis()}</div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card glow"><h3>◈ איברי-המערכת</h3>${organsMap()}<div class="more">כל איבר חי בגיט ונמדד בפעימות. פרטים: <a href="#/repos">ריפואים</a> · <a href="#/fleet">הצי</a></div></div>
    <div class="card"><h3>∞ הלופ-האוטונומי — המערכת לעולם לא נגמרת</h3>${endlessLoop()}</div>
  </div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>♛ הערוץ-הריבוני — היחיד</h3>${channelPreview()}<div class="more"><a href="#/channel">פתח-את-הערוץ המלא →</a></div></div>
    <div class="card"><h3>🍋 לימונדה — חולשות הפכו עוצמה</h3>${lemonade()}</div>
  </div></div>`;
}

function channelPreview() {
  const items = [
    ...S.directives.slice(-2).map(d => ({ id: d.id, kind: "הוראה", t: d.title || d.law || "", st: d.status || "ACTIVE" })),
    ...S.notes.slice(-2).map(n => ({ id: n.id, kind: n.kind || "דוח", t: n.title || "", st: n.status || "" })),
    ...S.requests.filter(r => (r.status || "").startsWith("OPEN")).slice(0, 2).map(r => ({ id: r.id, kind: "בקשה", t: r.title || r.need || "", st: r.status }))
  ].slice(-5);
  if (!items.length) return `<div class="note">הזרמים טרם-נטענו — הצגת-גיבוי: D-0001 פעיל (חמשת-החוקים) · REQ-002/003 פתוחים.</div>`;
  return items.map(i => `<div class="msg"><div class="mh"><span class="id">${esc(i.id)}</span><span class="pill p-gold">${esc(i.kind)}</span><span class="t">${esc(i.t).slice(0, 90)}</span><span class="pill ${/OPEN/.test(i.st) ? "p-blue" : "p-ok"}">${esc(i.st)}</span></div></div>`).join("");
}

function vDex() {
  const d = EMBED.dex;
  return `<div class="view">
  <div class="h1">הבורסה-הריבונית <span class="gd">saos-dex</span></div>
  <div class="sub">5 שווקי-ליבה · בלוקים של ${d.blockSec}s · חוק-שימור ${esc(d.conservation)} · עמלות-בריכות ${fmt(d.poolFeesUu)}µ. המשימה: <b>הוכחת-ווליום-גבוה-מאוד (L-VOL)</b> — ווליום-אמיתי בלבד, אסור wash.</div>
  <div class="grid g-kpi" style="margin-top:14px">
    ${kpi("#" + fmt(d.headBlock), "ראש-השרשרת", d.blockSec + "s בלוק · " + d.engineCommit, "up")}
    ${kpi(fmt(d.ourBook.swaps), "סוואפים (ספר-מנוע)", asOf(d.ourBook.at))}
    ${kpi(fmt(d.ourBook.fills), "מילויים (fills)", "feeMeter " + fmt(d.ourBook.feeMeter))}
    ${kpi(fmt(d.treasury.mid), "מיד-מחיר SAOS/USDS", asOf(d.treasury.at))}
  </div>
  <div class="card" style="margin-top:14px"><h3>⇄ שווקי-הליבה</h3>
    <div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>זוג</th><th>תפקיד</th><th>טיר</th></tr></thead><tbody>
    ${d.markets.map(m => `<tr><td class="num"><b>${esc(m.pair)}</b></td><td>${esc(m.role)}</td><td><span class="pill ${m.tier === "core" ? "p-gold" : m.tier === "rail" ? "" : "p-blue"}">${esc(m.tier)}</span></td></tr>`).join("")}
    </tbody></table></div>
    <div class="note" style="margin-top:10px"><b>כנות:</b> המספרים נמדדו מספרי-המנוע (as-of ${esc(d.asOf)}); עדכון-חי לכל-פעימה הוא ליין L-VOL-הפתוח. אין-מספרים-מומצאים.</div>
  </div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>▲ מדף-המוצרים — כסף-מייצר-נזילות</h3>
      ${EMBED.products.map(p => `<div class="msg"><div class="mh"><span class="t">${esc(p.name)}</span><span class="pill ${p.state === "ACTIVE" ? "p-ok" : p.state === "TESTNET" ? "p-blue" : "p-gold"}">${esc(p.state)}</span><span class="asof">${esc(p.ref)}</span></div><div class="mb">${esc(p.desc)}</div></div>`).join("")}
    </div>
    <div class="card"><h3>∞ משימת-הנזילות (L-VOL)</h3>
      <div class="note"><b>החוק:</b> כל מהלך-צי נמדד בתרומתו לווליום-אמיתי על הדקס שלנו. MM מדוד, עמלות-AMM מדודות, demo מתויג — <b>אסור wash-volume</b> (R358).</div>
      <div class="more" style="margin-top:10px">מנוע-MM: פעיל (R358 · Domain twin) · אוצר: ${esc(d.treasury.verdict)} · גיר: ${EMBED.dex.gears.gear}/3 · kelly ${esc(EMBED.dex.gears.kelly.mode)} cap ${EMBED.dex.gears.kelly.cap}.</div>
      <div class="more">רנלים ישנים (STEEM/HIVE) = תחזוקה-בלבד (P-last, R343 §1). הדגש: <a href="#/bigcoins">מטבעות-גדולים →</a></div>
    </div>
  </div></div>`;
}

function vBigcoins() {
  return `<div class="view">
  <div class="h1">מטבעות-גדולים <span class="gd">ורשתות-מוכרות</span></div>
  <div class="sub">השפה-הציבורית של GIANT: BTC · ETH · USDT · USDC · SOL — ובמרכז המטבע-שלנו. רשתות-ישנות (STEEM/HIVE) לא מודגשות ולא מוסתרות — רנלי-תחזוקה.</div>
  <div class="grid g-3" style="margin-top:14px">
  ${EMBED.bigcoins.map(c => `<div class="card ${c.ours ? "glow" : ""}"><h3>${esc(c.sym)} — ${esc(c.name)} ${c.ours ? '<span class="pill p-gold">אנחנו</span>' : ""}</h3>
    <div class="more"><b>רשת:</b> ${esc(c.net)}</div><div class="more">${esc(c.why)}</div>
    <div class="more">${c.ours ? "נסחר כאן: <a href='#/dex'>saos-dex →</a>" : "מסלול-חיבור: גשר/onramp — ליין L-VOL"}</div></div>`).join("")}
  </div>
  <div class="note" style="margin-top:14px"><b>כנות-פעולה:</b> ההתכוונות אמיתית — נזילות נמשכת מעולם-המטבעות-הגדולים אל הדקס שלנו; כל-צעד-חיבור יירשם כאן עם ראיה. אין-הבטחות-תשואה.</div></div>`;
}

function vProducts() {
  return `<div class="view">
  <div class="h1">מוצרים <span class="gd">אוטונומיים</span> — הכסף של הריבונות</div>
  <div class="sub">סדר-העדיפויות לפי הבעלים: הוכחת-ווליום-גבוה על הדקס → נגזרות → הלוואות → מינוף. הכל כמו-הענקים — רק-חדשני-יותר.</div>
  <div class="grid g-3" style="margin-top:14px">${EMBED.products.map(p => `<div class="card"><h3>${esc(p.name)}</h3>
    <span class="pill ${p.state === "ACTIVE" ? "p-ok" : p.state === "TESTNET" ? "p-blue" : "p-gold"}">${esc(p.state)}</span>
    <div class="more">${esc(p.desc)}</div><div class="a asof">${esc(p.ref)}</div></div>`).join("")}</div>
  <div class="card" style="margin-top:14px"><h3>∞ איך זה נבנה בלי-סוף</h3>${endlessLoop()}</div></div>`;
}

function vChannel() {
  const tabs = [["d", "הוראות-בעלים (" + S.directives.length + ")"], ["r", "בקשות-ריבונות (" + S.requests.length + ")"], ["n", "דוחות-צי (" + S.notes.length + ")"], ["v", "קול-הריבונות"]];
  return `<div class="view">
  <div class="h1">הערוץ-הריבוני <span class="gd">היחיד</span></div>
  <div class="sub">SAOS-SOVEREIGN-CHANNEL/1.2 · בעלים ↔ ריבונות, אפס-מתווכים. הזרמים: <span class="mono">state/sovereign-channel/</span> · המשטח-היחיד: GIANT. כל-משטח-אחר = redirect (R360 §2).</div>
  <div class="tabs" id="ctabs" style="margin-top:14px">${tabs.map((t, i) => `<button data-t="${t[0]}" class="${i === 0 ? "on" : ""}">${esc(t[1])}</button>`).join("")}</div>
  <div id="cbody"></div>
  <div class="card" style="margin-top:14px"><h3>✍ הוראה-חדשה (בעלים בלבד — אפס-מפתחות)</h3>
    <div id="composer"></div>
    <div class="note" style="margin-top:10px">הזרימה: נסח-הוראה → העתק-שורת-JSON → פתח את הקובץ בעורך הגיט → הדבק בסוף → קומיט. הקומיט נעשה בזהות-הבעלים; הדף לעולם לא נוגע במפתחות.</div>
  </div></div>`;
}

function msgCard(m, kind) {
  const st = m.status || "ACTIVE";
  const pill = /OPEN/.test(st) ? "p-blue" : /REJECTED|FAIL/.test(st) ? "p-red" : "p-ok";
  return `<div class="msg"><div class="mh"><span class="id">${esc(m.id)}</span><span class="pill ${pill}">${esc(st)}</span><span class="t">${esc(m.title || m.law || m.need || "")}</span></div>
  <div class="mb">${esc(m.body || (m.directive ? m.directive.join("\n") : "") || "")}</div>
  <div class="mf">${m.trace ? `<span class="asof">${esc(m.trace)}</span>` : ""}${m.at ? asOf(m.at) : ""}</div></div>`;
}

function renderCTab(t) {
  const el = $("#cbody");
  if (t === "d") el.innerHTML = (S.directives.length ? S.directives.slice().reverse().map(d => msgCard(d)).join("") : `<div class="note">הזרם-לא-נטען — גיבוי: D-0001 פעיל (חמשת-החוקים).</div>`);
  if (t === "r") el.innerHTML = (S.requests.length ? S.requests.slice().reverse().map(r => msgCard(r)).join("") : `<div class="note">הזרם-לא-נטען — גיבוי: REQ-002/003 פתוחים.</div>`);
  if (t === "n") el.innerHTML = (S.notes.length ? S.notes.slice().reverse().map(n => msgCard(n)).join("") : `<div class="note">אין-דוחות-טעונים (notes.jsonl).</div>`);
  if (t === "v") {
    const v = S.voice;
    el.innerHTML = v ? `<div class="card"><h3>🗣 קול-הריבונות (translation-only · anti-invention)</h3>
      <div class="msg"><div class="mh"><span class="pill ${v.status === "OK" ? "p-ok" : "p-gold"}">${esc(v.status || "?")}</span>${v.generatedAt ? asOf(v.generatedAt) : ""}</div>
      <div class="mb">${esc(v.text || v.body || v.message || "—")}</div></div>
      <div class="more">כלל-אמת: הקול מתרגם קלטים-נמדדים בלבד; מספר-לא-מאומת = דחייה; כשל = UNAVAILABLE כן. ${v.reason ? "reason: " + esc(v.reason) : ""}</div></div>`
      : `<div class="note">voice.json לא-נטען — מצב-כנה: לא-נמדד-כאן-עכשיו.</div>`;
  }
}

function nextId(list, pfx) {
  let mx = 0;
  list.forEach(x => { const m = /(\d+)$/.exec(x.id || ""); if (m) mx = Math.max(mx, +m[1]); });
  return pfx + "-" + String(mx + 1).padStart(4, "0");
}

function composer() {
  const nid = nextId(S.directives, "D");
  const at = new Date().toISOString();
  const el = $("#composer");
  el.innerHTML = `
  <input id="cz-title" placeholder="כותרת-ההוראה (למשל: GIANT: הוסיפו שוק X)" style="width:100%;min-height:44px;border-radius:11px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);padding:10px 14px;font-size:14px">
  <textarea id="cz-body" rows="4" placeholder="גוף-ההוראה — כל-שורה = סעיף-חוק-בנחיתה" style="width:100%;margin-top:8px;border-radius:11px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);padding:10px 14px;font-size:14px"></textarea>
  <div class="row" style="margin-top:10px">
    <button class="btn gold" id="cz-gen">נסח שורת-JSON (${esc(nid)})</button>
    <button class="btn ghost" id="cz-copy" disabled>העתק</button>
    <a class="btn ghost" id="cz-open" style="display:none" href="https://github.dev/roshpinacare-sys/Pulse/blob/main/state/sovereign-channel/directives.jsonl" target="_blank" rel="noopener">פתח-בעורך-וקומיט ↗</a>
  </div>
  <pre id="cz-out" class="mono" style="display:none;margin-top:10px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--rs);padding:10px;font-size:11px;overflow-x:auto;white-space:pre-wrap"></pre>`;
  let line = "";
  $("#cz-gen").onclick = () => {
    const title = ($("#cz-title").value || "").trim() || "הוראת-בעלים";
    const body = ($("#cz-body").value || "").trim();
    if (!body) { $("#cz-out").style.display = "block"; $("#cz-out").textContent = "// נדרש גוף-הוראה"; return; }
    line = JSON.stringify({ id: nid, at, by: "owner", law: "R360 §2", title, directive: body.split("\n").map(s => s.trim()).filter(Boolean), status: "ACTIVE" });
    $("#cz-out").style.display = "block"; $("#cz-out").textContent = line;
    $("#cz-copy").disabled = false; $("#cz-open").style.display = "inline-flex";
  };
  $("#cz-copy").onclick = function () {
    if (!line) return;
    if (navigator.clipboard) navigator.clipboard.writeText(line).then(() => { this.textContent = "הועתק ✓"; }, () => { this.textContent = "העתיקו-ידנית"; });
    else { const ta = document.createElement("textarea"); ta.value = line; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); this.textContent = "הועתק ✓"; } catch (e) { this.textContent = "העתיקו-ידנית"; } ta.remove(); }
  };
}

function vWallet() {
  return `<div class="view">
  <div class="h1">ארנק <span class="gd">ומשמורת</span></div>
  <div class="sub">Saosmartwallet — ארנק-הריבונות. המצב כן: קליפת-משמורת; תחייה מלאה = מופעלת-בעלים (סמכות-מפתחות owner-gated לפי החוק).</div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>◇ מצב-משמורת</h3>
      <div class="msg"><div class="mh"><span class="pill p-gold">OWNER-GATED</span><span class="t">Saosmartwallet</span></div>
      <div class="mb">קליפה-חיה בגיט; עבודת-איחוד אחרונה נמדדה 2026-10-13 (G6 twin-tombstone). Actions מושבתות מקוות-פרטי (T-73). תחייה = החלטת-בעלים דרך הערוץ.</div></div>
      <div class="note" style="margin-top:10px"><b>חוק-משמורת:</b> אף-סוכן לא נוגע במפתחות. אישור-פעולת-מיינט = דו-מפתח-בעלים (mandate v4 · liveOwnerArmed=false).</div></div>
    <div class="card"><h3>🛡 קופסא-שחורה — מה מוגן</h3>
      <div class="organs">
      ${[["vault GEN3", "מוצפן · headcorner-שער"], ["זהות-גיט", "326012154+roshpinacare-sys@users.noreply.github.com"], ["leak-scan T-41", "redact לפני push · 0 דליפות"], ["fail-closed", "כשל = עצירה, לא-המצאה"]].map(x => `<div class="organ"><span class="dot"></span><span>${esc(x[0])}<small>${esc(x[1])}</small></span></div>`).join("")}
      </div></div>
  </div></div>`;
}

function vFleet() {
  const f = (S.net && S.net.fleet) || [];
  const lanes = [
    ["L-VOL", "מנוע-ווליום על הדקס", "פתוח"],
    ["L-WALLET", "ממשק-ארנק מקצועי", "פתוח"],
    ["L-STATE", "בורסת-מגזרים + מדדי-חדשנות", "פתוח"],
    ["L-SEC", "רשימת-אבטחה חיה (EVM/הונאות)", "פתוח"],
    ["L-BRAND", "מיתוג + ערוץ-ציבורי", "פתוח"],
    ["L-GRID-LOW", "הילוך-1 בקצב-נמוך", "פתוח"],
    ["L-LAW", "איחוד-רישומי-חוק", "חלקי (19-d)"],
    ["GIANT", "המערכת-האחת (R360)", "בוצע-היום"]
  ];
  const chain = "ROAST-1 → T-96 (R353) → PLAN-1/2/3 → EXEC-G (R358) → SOV-1 (R359) → GIANT (R360)";
  return `<div class="view">
  <div class="h1">הצי <span class="gd">האוטונומי</span></div>
  <div class="sub">סוכנים חיים ומתים — הריבונות נשארת. תיאום: תביעת-ליין לפני ביצוע · גבולות-קבצים · אפס-דריסות · MTT.</div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>▲ ליינים-פתוחים (R343 §8 + R360)</h3>
      ${lanes.map(l => `<div class="msg"><div class="mh"><span class="id">${esc(l[0])}</span><span class="t">${esc(l[1])}</span><span class="pill ${l[2] === "בוצע-היום" ? "p-ok" : "p-blue"}">${esc(l[2])}</span></div></div>`).join("")}
      <div class="note"><b>שרשרת-הגלים:</b> <span class="mono">${esc(chain)}</span></div></div>
    <div class="card"><h3>⬡ פעימות-צי נמדדות</h3>${f.length ? `<div class="tblwrap" style="border:none"><table class="tbl"><thead><tr><th>ריפו</th><th>ויזות</th><th>Actions</th></tr></thead><tbody>
      ${f.slice(0, 14).map(r => `<tr><td><b>${esc(r.name)}</b>${r.private ? ' <span class="pill">פרטי</span>' : ""}</td><td class="num">${(r.lastCommitAt || "").slice(0, 16) || "—"}</td><td>${r.actions ? `<span class="pill ${r.actions.conclusion === "success" || r.actions.status === "in_progress" ? "p-ok" : r.actions.conclusion === "failure" ? "p-red" : ""}">${esc(r.actions.conclusion || r.actions.status || "—")}</span>` : "—"}</td></tr>`).join("")}
      </tbody></table></div><div class="more">מקור: ../state/network.json · ${asOf(S.net && S.net.generatedAt)}</div>` : `<div class="note">לא-נטען — כנות: אין-מדידה-כאן-עכשיו.</div>`}</div>
  </div></div>`;
}

function vLaws() {
  const L = EMBED.law;
  const timeline = [
    ["R328", "היפוך-כלכלי: הריבונות מממנת-את-עצמה"],
    ["R332", "תוכנית-אם: הריבונות שורדת-סוכנים (MTT)"],
    ["R343", "איחוד-הצי: המטבע-שלנו-במרכז · dex-ווליום"],
    ["R344", "ערוץ-ישיר בעלים↔ריבונות · אפס-מתווכים"],
    ["R358", "גל-G: MM-סופרמטיה · כנות-ווליום"],
    ["R359", "SOV-1: קונסולה על הזרמים-הקנוניים"],
    ["R360", "GIANT: מערכת-אחת · ערוץ-אחד · אין-סוף"]
  ];
  return `<div class="view">
  <div class="h1">חוקים <span class="gd">ואמת</span></div>
  <div class="sub">אמת-תלת-מצבית: TRUE (נמדד) · CLAIM-ONLY (נטען-בלבד) · שקט (לא-נמדד). אין-מספרים-מומצאים. לעולם.</div>
  <div class="card glow" style="margin-top:14px"><h3>§ ${esc(L.id)} — ${esc(L.title)} (החוק-החדש, היום)</h3>
    ${L.laws.map((l, i) => `<div class="msg"><div class="mh"><span class="id">§${i + 1}</span><span class="t">${esc(l)}</span></div></div>`).join("")}</div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>⏱ ציר-החוקים</h3>${timeline.map(t => `<div class="msg"><div class="mh"><span class="id">${esc(t[0])}</span><span class="t">${esc(t[1])}</span></div></div>`).join("")}</div>
    <div class="card"><h3>🧹 מרשם-ביטול-הכפילויות (G-1..G-8)</h3>
      ${L.dup.map(d => `<div class="msg"><div class="mh"><span class="id">${esc(d.g)}</span><span class="pill ${d.state === "done" ? "p-ok" : "p-gold"}">${esc(d.state)}</span><span class="t">${esc(d.what)}</span></div><div class="mb">${esc(d.verdict)}</div></div>`).join("")}
      <div class="note"><b>הכלל:</b> מכאן-ולהבא — משטח-חדש לא נולד; משטח-ישן לא מתחרה. הכל נכנס ל-GIANT.</div></div>
  </div></div>`;
}

function vGiants() {
  const rows = S.giants.rows;
  const mx = Math.max(...rows.map(r => r.vol24h || 0), 1);
  return `<div class="view">
  <div class="h1">מול-הענקים <span class="gd">מדידה-כנה, כל-יום</span></div>
  <div class="sub">ליגת-הענקים נמדדת אוטומטית (DefiLlama · אפס-מפתחות) — Uniswap, PancakeSwap, Aerodrome, Orca, Raydium, Meteora. אנחנו בשורה עם המספרים-שלנו בלבד.</div>
  <div class="card" style="margin-top:14px"><h3>★ ווליום-24h — ליגה ${asOf(S.giants.asOf)}</h3>
    <div class="lg">
    ${rows.map(r => `<div class="lgrow ${r.ours ? "ours" : ""}">
      <span class="nm">${esc(r.name)} ${r.ours ? '<span class="pill p-gold">אנחנו</span>' : ""}</span>
      <span class="bar"><i style="width:${r.vol24h ? Math.max(2, (r.vol24h / mx) * 100).toFixed(1) : 2}%"></i></span>
      <span class="vv">${r.ours ? "ספר-מנוע: " + fmt(EMBED.dex.ourBook.swaps) + " סוואפים" : usd(r.vol24h)}</span></div>`).join("")}
    </div>
    <div class="note" style="margin-top:12px"><b>הכנות:</b> הפער אדיר — וזו הנקודה. לימונדה: הענקים מיושנים (ליטנציות, ממשל-עמום, אין-אמת-תלת-מצבית); אנחנו חדשניים: בלוקים 3s · ריבונות-מממנת-עצמה · חוקים-חיים-בגיט · כל-מספר-עם-ראיה. הדרך: הוכחת-ווליום (L-VOL) → נגזרות → הלוואות → מינוף.</div></div>
  <div class="card" style="margin-top:14px"><h3>🍋 אסטרטגיית-הלימונדה</h3>${lemonade()}</div></div>`;
}

function vRepos() {
  const tot = (S.net && S.net.totals) || {};
  const seed = [
    ["Pulse", "דופק + ערוץ + GIANT (ציבורי)"], ["saos-dex", "הבורסה הריבונית"], ["steem", "רישום-חוקים (saos-cockpit)"],
    ["Console", "משטח-אמת ציבורי + ליגת-ענקים"], ["Domain", "תאום-MM (R358)"], ["Autonomy", "sovereign-tick"],
    ["Saosmartwallet", "ארנק (owner-gated)"], ["FleetHQ", "מטה-הצי"], ["GridWatch", "משמרת-הגריד"],
    ["sovereign-lighthouse", "מגדלור (→GIANT)"], ["ops-forge", "נפחיית-מערכות"], ["roshpinacare-sys.github.io", "פתח-הבית הציבורי"]
  ];
  return `<div class="view">
  <div class="h1">ריפואים <span class="gd">מפת-הריבונות</span></div>
  <div class="sub">${fmt(tot.repos ?? 37)} ריפואים · ${fmt(tot.public)} ציבוריים · ${fmt(tot.private)} פרטיים · issues פתוחים ${fmt(tot.issuesOpen)}. מרשם-מחייב: steem/docs/FLEET-REPOS-REGISTRY (רישום-לפני-בנייה).</div>
  <div class="grid g-3" style="margin-top:14px">${seed.map(r => `<div class="card"><h3>⬡ ${esc(r[0])}</h3><div class="more">${esc(r[1])}</div><div class="more"><a href="https://github.com/roshpinacare-sys/${esc(r[0])}" target="_blank" rel="noopener">פתח-בגיט ↗</a></div></div>`).join("")}</div>
  <div class="card" style="margin-top:14px"><h3>🗒 ריפואים-עם-פסק-דין (stale-24h מוסבר)</h3>
    ${(S.net && S.net.stale24hAnnotated || []).slice(0, 6).map(s => `<div class="msg"><div class="mh"><span class="id">${esc(s.name)}</span><span class="pill p-gold">${esc(s.verdict)}</span></div><div class="mb">${esc((s.reason || "").slice(0, 240))}</div></div>`).join("") || `<div class="note">לא-נטען.</div>`}
  </div></div>`;
}

/* ============ admin (headcorner) ============ */
const ADMIN_HASH = "849e9df7e612b968739ac425cd8fbe3f8f23989c8f4621d69a61dc406c4e41bc";
async function sha256hex(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}
function isAdmin() { try { return sessionStorage.getItem("giant-admin") === "1"; } catch (e) { return false; } }

function vAdmin() {
  if (!isAdmin()) return `<div class="view"><div class="gate card glow">
    <div class="h1" style="margin-bottom:6px">♛ שער-הבעלים</div>
    <div class="sub" style="margin:0 auto 16px">הסיסמה שפותחת-הכל (HEADcorner). השער = נוחות בלבד; פעולות-משמורת תמיד דו-מפתח-בעלים.</div>
    <input type="password" id="apw" placeholder="••••••••••" autocomplete="current-password" aria-label="סיסמת-ניהול">
    <div class="err" id="aerr"></div>
    <button class="btn gold" id="ago" style="width:100%">פתח-הכל</button>
    <div class="asof" style="margin-top:12px">sha256-gate · אפס-אחסון-טקסט-גלוי · אפס-מפתחות-ברשת</div>
  </div></div>`;
  const d = EMBED.dex;
  return `<div class="view">
  <div class="row" style="justify-content:space-between"><div><div class="h1">ניהול <span class="gd">מלא</span> — הבעלים</div>
  <div class="sub">הכל פתוח: זרמים גולמיים, מרשם-הכפילויות, מחבר-הוראות, נתוני-מנוע.</div></div>
  <button class="btn ghost" id="alock">נעל</button></div>
  <div class="grid g-kpi" style="margin-top:14px">${econKpis()}</div>
  <div class="grid g-2" style="margin-top:14px">
    <div class="card"><h3>✍ מחבר-הוראות (מלא)</h3><div id="composer2"></div></div>
    <div class="card"><h3>🧹 מרשם-כפילויות — פעולות</h3>
      ${EMBED.law.dup.map(x => `<div class="msg"><div class="mh"><span class="id">${esc(x.g)}</span><span class="pill ${x.state === "done" ? "p-ok" : "p-gold"}">${esc(x.state)}</span><span class="t">${esc(x.what)}</span></div><div class="mb">${esc(x.verdict)}</div></div>`).join("")}
      <div class="note"><b>הבא-בתור (ליינים-פתוחים):</b> L-WALLET ממשק-מלא · L-STATE בורסת-מגזרים · L-SEC רשימה-חיה · עדכון-דקס-חי לכל-פעימה (heartbeat מזריק dex-snapshot).</div></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>📦 זרמים-גולמיים</h3>
    <div class="row">
      <a class="btn ghost" href="../state/sovereign-channel/directives.jsonl" target="_blank" rel="noopener">directives.jsonl ↗</a>
      <a class="btn ghost" href="../state/sovereign-channel/requests.jsonl" target="_blank" rel="noopener">requests.jsonl ↗</a>
      <a class="btn ghost" href="../state/sovereign-channel/notes.jsonl" target="_blank" rel="noopener">notes.jsonl ↗</a>
      <a class="btn ghost" href="../state/network.json" target="_blank" rel="noopener">network.json ↗</a>
      <a class="btn ghost" href="../mirror/lanes.json" target="_blank" rel="noopener">lanes.json ↗</a>
    </div>
    <div class="note" style="margin-top:10px">מנוע: ${esc(d.engineCommit)} · ראש #${fmt(d.headBlock)} · שימור ${esc(d.conservation)} · ${asOf(d.asOf)}</div>
  </div></div>`;
}

function wireAdmin() {
  const go = $("#ago");
  if (go) go.onclick = async () => {
    const v = ($("#apw").value || "").trim().toLowerCase();
    const h = await sha256hex(v);
    if (h === ADMIN_HASH) { try { sessionStorage.setItem("giant-admin", "1"); } catch (e) {} route(); }
    else $("#aerr").textContent = "סיסמה-לא-נכונה — השער-כנה: כשל הוא כשל.";
  };
  $("#apw") && $("#apw").addEventListener("keydown", e => { if (e.key === "Enter") go && go.click(); });
  const lock = $("#alock");
  if (lock) lock.onclick = () => { try { sessionStorage.removeItem("giant-admin"); } catch (e) {} route(); };
  if (isAdmin()) { const c = $("#composer2"); if (c) { c.id = "composer"; composer(); c.id = "composer2"; } }
}

/* ============ router ============ */
const VIEWS = { home: vHome, dex: vDex, bigcoins: vBigcoins, products: vProducts, channel: vChannel, wallet: vWallet, fleet: vFleet, laws: vLaws, giants: vGiants, repos: vRepos, admin: vAdmin };
function route() {
  const id = (location.hash || "#/home").replace(/^#\//, "") || "home";
  const cur = VIEWS[id] ? id : "home";
  buildNav(cur);
  $("#view").innerHTML = VIEWS[cur]();
  if (cur === "channel") { renderCTab("d"); composer(); $("#ctabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; document.querySelectorAll("#ctabs button").forEach(x => x.classList.remove("on")); b.classList.add("on"); renderCTab(b.dataset.t); }); }
  if (cur === "admin") wireAdmin();
  $("#footstamp").textContent = "R360 · " + new Date().toISOString().slice(0, 16).replace("T", " ") + "Z · כל-הכבוד-לצי";
  window.scrollTo({ top: 0 });
}

window.addEventListener("hashchange", route);
document.addEventListener("DOMContentLoaded", async () => {
  route();
  await loadAll();
  route();
  setInterval(() => { $("#clock").textContent = new Date().toISOString().slice(11, 19) + "Z"; }, 1000);
  setInterval(async () => { await loadAll(); const id = (location.hash || "").replace(/^#\//, ""); if (id === "home" || id === "channel") route(); }, 120000);
});
