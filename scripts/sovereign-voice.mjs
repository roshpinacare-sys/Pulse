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

// ---- 3. הקול (GitHub Models — נתיב-חינם-על-Actions-ציבורי) ----
const TOKEN = process.env.GITHUB_TOKEN || '';
const MODEL = process.env.SOVEREIGN_VOICE_MODEL || 'openai/gpt-4o-mini';
const ENDPOINT = process.env.SOVEREIGN_VOICE_ENDPOINT || 'https://models.github.ai/inference/chat/completions';

if (!TOKEN) { writeHonest('UNAVAILABLE', 'no-token (GITHUB_TOKEN missing) — כנה: בלי-אסימון-אין-קול'); process.exit(0); }

const SYSTEM = [
  'אתה קול-הריבונות של SAOS — מתרגם מצב-ממודד לשפה-אנושית בעברית.',
  'חוקים אבסולוטיים:',
  '1) אסור לך להמציא, לעגל, או להכניס אף מספר שלא מופיע מילה-במילה בקלט. השתמש במספרים בדיוק כפי שניתנו.',
  '2) אסור לך להבטיח דבר, לייעץ, או להוסיף עובדות מחוץ לקלט.',
  '3) 2-4 משפטים קצרים, עברית, עובדתית, ללא-קישוט.',
  '4) אם ערך-מסוים null — אמור שהוא לא-נמדד-כרגע; אל תנחש.',
].join('\n');

const USER = [
  'תרגם את מצב-הריבונות-הממודד-הבא ל-2-4 משפטים בעברית:',
  'קלט-ממודד (המקור-היחיד): ' + JSON.stringify(inputs),
  openNeeds.length ? ('בקשות-פתוחות-לריבונות-מהבעלים (הזכר בקצרה, בלי להוסיף פרטים): ' + JSON.stringify(openNeeds)) : 'אין-בקשות-פתוחות.',
].join('\n');

let summary = null, status = 'UNAVAILABLE', reason = '';
try {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    signal: ctrl.signal,
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'saos-sovereign-voice/1' },
    body: JSON.stringify({
      model: MODEL, temperature: 0.2, max_tokens: 300,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER }],
    }),
  });
  clearTimeout(t);
  if (!res.ok) { reason = 'models-api-' + res.status; }
  else {
    const j = await res.json();
    const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (typeof txt === 'string' && txt.trim().length > 10) summary = txt.trim();
    else reason = 'empty-or-malformed-response';
  }
} catch (e) { reason = 'fetch-failed: ' + (e && e.name === 'AbortError' ? 'timeout-30s' : String(e).slice(0, 120)); }

// ---- 4. חוק-אי-ההמצאה: כל-מספר-בסיכום-חייב-להיות-בקלט ----
if (summary) {
  const inputBlob = JSON.stringify(inputs) + ' ' + JSON.stringify(openNeeds);
  const nums = summary.match(/\d[\d.,]*/g) || [];
  const foreign = nums.filter(n => !inputBlob.includes(n.replace(/,$/, '')));
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
