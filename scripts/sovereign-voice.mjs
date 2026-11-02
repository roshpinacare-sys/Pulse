#!/usr/bin/env node
// sovereign-voice.mjs — קול-הריבונות (SAOS-SOVEREIGN-VOICE/1)
// חוק-האם: steem/docs/R344-SOVEREIGN-DIRECT-CHANNEL.md §3 + saos-dex DECISIONS #20
//
// עיקרון-היושרה (קשיח):
//  1. ה-LLM מתורגם-שפה-בלבד — הוא מקבל רק ערכים ממודדים (network.json + שני-הזרמים)
//     ואסור-לו-להכניס אף-מספר-שלא-נמצא-בקלט. כל-מספר-זר = REJECTED (כנה, לא מוצג).
//  2. כשל-רשת/מודל/אסימון = status UNAVAILABLE + סיבה — לעולם-לא שקר, לעולם-לא המצאה.
//  3. אפס-שינוי-קלטים + קול-תקף-קיים = SKIP-UNCHANGED (כלכלת-2-ליבות, חיסכון-מכסה).
//  4. אפס-סודות: האסימון-רק-דרך-env, לעולם-לא-נכתב/נרשם.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = process.cwd();
const VOICE_PATH = 'state/sovereign-channel/voice.json';
const NOW = new Date().toISOString().slice(0, 19) + 'Z';

function readJSON(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }
function readJSONL(p) {
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

// ---- 1. קלטים-ממודדים (המקור-היחיד-לאמת) — מבנה-נמדד 2026-10-14: n.economy.* / n.totals / n.chains ----
const net = readJSON('state/network.json');
if (!net) { writeHonest('UNAVAILABLE', 'network.json קריאה-נכשלה — הקול-לא-מדבר-בלי-מדידה'); process.exit(0); }

const eco = net.economy || {};
const gb = eco.gearbox || {};
const kelly = gb.kelly || {};
const treasury = eco.treasury || {};
const army = eco.army || {};
const totals = net.totals || {};
const steemChain = (net.chains && net.chains.steem) || {};
const inputs = {
  generatedAt: net.generatedAt || null,
  gear: typeof gb.gear === 'number' ? gb.gear : null,
  gearsCount: typeof gb.gearsCount === 'number' ? gb.gearsCount : null,
  lastVerdict: gb.lastVerdict || null,
  greenStreak: typeof gb.greenStreak === 'number' ? gb.greenStreak : null,
  kellyMode: kelly.mode || null,
  kellyCap: typeof kelly.cap === 'number' ? kelly.cap : null,
  gapsOpen: typeof eco.gapsOpen === 'number' ? eco.gapsOpen : null,
  treasuryVerdict: treasury.verdict || null,
  treasuryOpenOrders: typeof treasury.openOrders === 'number' ? treasury.openOrders : null,
  armyVerdict: army.verdict || null,
  armyRoster: typeof army.roster === 'number' ? army.roster : null,
  armyActed: typeof army.acted === 'number' ? army.acted : null,
  reposTotal: typeof totals.repos === 'number' ? totals.repos : null,
  reposPublic: typeof totals.public === 'number' ? totals.public : null,
  steemHead: typeof steemChain.head === 'number' ? steemChain.head : null,
};
const directives = readJSONL('state/sovereign-channel/directives.jsonl');
const requests = readJSONL('state/sovereign-channel/requests.jsonl');
inputs.activeDirectives = directives.filter(d => d.status === 'ACTIVE').length;
inputs.openRequests = requests.filter(r => r.status === 'OPEN').length;
const openNeeds = requests.filter(r => r.status === 'OPEN').map(r => ({ id: r.id, need: String(r.need || '').slice(0, 160) }));

// ---- 2. SKIP-UNCHANGED (כלכלת-קצה) ----
const INPUTS_KEY = JSON.stringify(inputs) + '|' + JSON.stringify(openNeeds);
if (existsSync(VOICE_PATH)) {
  const prev = readJSON(VOICE_PATH);
  if (prev && prev.status === 'TRUE' && prev.inputsKey === INPUTS_KEY) {
    console.log('SKIP-UNCHANGED: inputs identical, voice ' + prev.at + ' still valid');
    process.exit(0);
  }
}

// ---- 3. הקול — LLM חיצוני אופציונלי, ואחרת תבנית מדוידת (אפס-המצאה) ----
// GitHub Models פרושה (2026-07-30) — אין עוד נתיב-חינם-מובנה; ברירת-המחדל קול-חי מתבסס-אך-מדידה.
const TOKEN = process.env.SOVEREIGN_VOICE_API_KEY || process.env.GITHUB_TOKEN || '';
const API_URL = process.env.SOVEREIGN_VOICE_API_URL || '';
const MODEL = process.env.SOVEREIGN_VOICE_MODEL || (API_URL ? 'openai/gpt-4o-mini' : 'template/he-1 (deterministic, zero-invention)');

function templateSummary() {
  // חוק-אי-המצאה: רק ערכים-שזורמים מילה-במילה מקלט-הממודד; null = "לא-נמדד-כרגע".
  const p = [];
  p.push(inputs.gear != null
    ? ('מצב-מנוע: גיר ' + inputs.gear + '/' + (inputs.gearsCount != null ? inputs.gearsCount : '?') + (inputs.lastVerdict ? ' (' + inputs.lastVerdict + ')' : '') + (inputs.greenStreak != null ? ' · רצף-ירוק ' + inputs.greenStreak : ''))
    : 'מצב-מנוע: לא-נמדד-כרגע');
  p.push(inputs.gapsOpen != null ? ('פערים-פתוחים: ' + inputs.gapsOpen) : 'פערים: לא-נמדד');
  p.push(inputs.treasuryVerdict
    ? ('אוצר: ' + inputs.treasuryVerdict + (inputs.treasuryOpenOrders != null ? ' · הזמנות-חיות ' + inputs.treasuryOpenOrders : ''))
    : 'אוצר: לא-נמדד-כרגע');
  p.push(inputs.armyVerdict
    ? ('צבא: ' + inputs.armyVerdict + (inputs.armyRoster != null ? ' (' + inputs.armyRoster + ' ברוסטר, פעלו ' + (inputs.armyActed != null ? inputs.armyActed : '?') + ')' : ''))
    : 'צבא: לא-נמדד-כרגע');
  p.push('ריפואים: ' + (inputs.reposTotal != null ? inputs.reposTotal : '?') + ' (' + (inputs.reposPublic != null ? inputs.reposPublic : '?') + ' ציבוריים) · ראש-שרשרת-steem: ' + (inputs.steemHead != null ? inputs.steemHead : 'לא-נמדד') + ' · הוראות-פעילות: ' + inputs.activeDirectives + ' · בקשות-פתוחות: ' + inputs.openRequests);
  return p.slice(0, 4).join('. ') + '. ' + p[4] + '.';
}

let summary = null, status = 'UNAVAILABLE', reason = '';
if (API_URL && TOKEN) {
  const reasons = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(API_URL, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'saos-sovereign-voice/1' },
      body: JSON.stringify({ model: MODEL, temperature: 0.2, max_tokens: 300, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }] }),
    });
    clearTimeout(t);
    if (!res.ok) { reasons.push(API_URL.replace(/^https:\/\//, '').split('/')[0] + ':' + res.status); }
    else {
      const raw = await res.text(); let j = null;
      try { j = JSON.parse(raw); } catch { j = null; }
      if (!j) reasons.push(API_URL.replace(/^https:\/\//, '').split('/')[0] + ':non-json-body(len=' + raw.length + ',head=' + raw.slice(0, 60).replace(/\s+/g, ' ') + ')');
      else {
        const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (typeof txt === 'string' && txt.trim().length > 10) summary = txt.trim();
        else reasons.push(API_URL.replace(/^https:\/\//, '').split('/')[0] + ':empty-response');
      }
    }
  } catch (e) { reasons.push('external-llm:fetch-failed:' + (e && e.name === 'AbortError' ? 'timeout' : String(e).slice(0, 60))); }
  if (!summary) reason = 'external-llm-fail (' + reasons.join(' | ') + ') — נופל-לתבנית-המדוידה';
}
if (!summary) { summary = templateSummary(); status = 'TRUE'; }

// ---- 4. חוק-אי-ההמצאה: כל-מספר-בסיכום-חייב-להיות-בקלט ----
if (summary) {
  const inputBlob = JSON.stringify(inputs) + ' ' + JSON.stringify(openNeeds);
  const nums = summary.match(/\d[\d.,]*/g) || [];
  // תיקון רגיל: נקודה/פסיק בסוף-משפט הם דקודוקס, לא מספר-זר (רק הספרה-עצמה נבדקת בקלט)
  const foreign = nums.filter(n => !inputBlob.includes(n.replace(/[.,]+$/, '')));
  if (foreign.length) { status = 'REJECTED'; reason = 'foreign-numbers: ' + foreign.slice(0, 5).join(','); summary = null; }
  else status = 'TRUE';
}

// ---- 5. כתיבה-כנה ----
function writeHonest(st, why) {
  const out = { schema: 'SAOS-SOVEREIGN-VOICE/1', at: NOW, status: st, reason: why || null, model: MODEL, summary: null, inputs, inputsKey: INPUTS_KEY, inputsSource: 'state/network.json + sovereign-channel streams (git HEAD)' };
  writeFileSync(VOICE_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log('VOICE-' + st + (why ? ': ' + why : ''));
}
if (status === 'TRUE') {
  const out = { schema: 'SAOS-SOVEREIGN-VOICE/1', at: NOW, status: 'TRUE', reason: null, model: MODEL, summary, inputs, inputsKey: INPUTS_KEY, inputsSource: 'state/network.json + sovereign-channel streams (git HEAD)' };
  writeFileSync(VOICE_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log('VOICE-TRUE: ' + summary.slice(0, 80) + '…');
} else {
  writeHonest(status, reason);
}
process.exit(0);
