# אינטל T-84 — העמקת Open-Pomelli (ולמה היא קודמת ל-hermoso)

> trace 1a138f98b9a80b61 · 2026-10-14 · שאילת-הבעלים המוטמעת ב-T-83: "באיזה קוד מקור נתעמק תחילה — Open-Pomelli או hermoso?"
>
> שיטה: הקוד נמדד על הדיסק (`external/Open-Pomelli/src/lib/*.ts`), לא מתיאורי-שיווק. כל טענה עם קובץ-מקור.

## 1. התשובה: Open-Pomelli ראשון — שלושה נימוקים מדודים

1. **דפוס-מותג כבר אומץ** — R302 כבר חי על `content-dna.json` בצורת-ה-Pomelli (Brand-DNA כקובץ-חתום, DECISIONS #19). העמקת-דפוס-מאומץ מניבה יותר מפתיחת-דפוס-נדחה.
2. **hermoso = מסילת-פרסום-ממומן** — 906 כלי-MCP למודעות Meta/Google/TikTok (נמדד: 13.7MB). אין תקציבי-פרסום ואין חשבונות-פרסום; הרשת Steem-אורגנית (דחייה מנומקת ב-#19). עומק-מקור של מסילה-נעולה = בזבוז-מדידה; היא תיבחן-מחדש רק כשתהיה מסילה (owner-gated, פרוטוקול §3 — משאבים כספיים).
3. **המקור עצמו ריבוני-ניתן-לאימוץ** — מודולים קטנים ודטרמיניסטיים; הענן-המשלם היחיד (`muapi.ts`) מבודד נקי — כל השאר דפוסים ניידים ללא-מפתחות.

## 2. מה נמדד במקור (קבלות-קוד)

| קובץ | מדידה | השוואה-לריבונות |
|---|---|---|
| `src/lib/brand-analyzer.ts` | BrandDNA = 15 שדות (toneOfVoice, keyMessages, palette, fonts...); חילוץ **דו-ערוצי מקבילי** (TEXT-prompt מגוף-האתר + VISION-prompt מצילומ-מסך, `Promise.all`) עם **קדימויות-מיזוג מפורשות** (צבעי-vision עם dedup מול palette מ-CSS `pickPalette`; personality = מיזוג טקסט+vision); ניתוח-JSON קפדני עם סובלנות-fenced; נרמול-הגנתי (`asString`/`asStringArray`) | דפוס-רענון-DNA עתידי: סריקת עמודי-ה-Domain שלנו → **דוח-סטיית-DNA** מוצע אוטונומית, יישום owner-gated (הקובץ חתום לבעלים) |
| `src/lib/campaign-generator.ts` | טקסונומיה של 6 מטרות-קמפיין; CampaignConcept = 8 שדות (title/theme/key_message/hook/cta/recommended_platforms/tone_notes/visual_direction); ה-prompt דורש "exactly 4 distinct concepts... not generic marketing fluff" | **הפער-המדוד**: ההבחנות-שם מוטלת על ה-prompt בלבד, לא נמדדת. אצלנו ההבחנות חוק-מדידה (Jaccard זוגי) — זה מה ש-R304 סגר |
| `src/lib/platforms.ts` | PlatformSpec פר-פורמט: `headlineMaxWords/bodyMaxWords/ctaMaxWords/tone` × 8 פורמטים (Instagram 1:1, Story 9:16, LinkedIn, Facebook-Ad, X 16:9, Web/Email banner, YouTube-thumb) | צורת-ההתאמה-רב-ממשקית ל-R300: גוף-אחד, מגבלות-הצגה פר-עמדת-תצוגה — רלוונטי למירור-עתידי מחוץ-ל-steemit.com |

**לא אומץ (בכוונה):** `muapi.ts` (ענף-תשלום — כמו FireCrawl/LangSmith ב-#19) · סכמת-Prisma (הדוקטרינה שלנו: ספרי-git, לא DB) · פרסום-Playwright (אנחנו מפרסמים ב-RPC של השרשרת).

## 3. מה נחתם בפועל — R304 · סולם-הקונספטים (steem `c7f33fc6d`)

`mini-services/saos-engine/content-concepts.mjs` — הקמפיין-גנרטור של פומלי בגרסת-ריבונות: **דטרמיניסטי, ללא-מפתחות, ללא-שעון** (בטוח-selftest), יושב **לפני** כתיבת-הטיוטה — המוות-הזול ראשון:

1. **וטו-סלופ** (לקסיקון R302 על title+hook) — קונספט-סלופ לעולם לא מרוויח גוף.
2. **וטו-זיכרון** (R303) — קונספט הדומה לכותרת שנדחתה/פורסמה מת בטרם-טיוטה; סוגר את חור-"הזיכרון-הרדוד" שלב אחד מוקדם מהשופט.
3. **הבחנות-מדודה** — חוק-אנטי-ההסלה מורם לרמת-הקונספט: שמירה-חמדנית רק אם Jaccard(shingles(hook+theme)) < `dna.memory.jaccard`. פומלי מבקשת "genuinely distinct" — אנחנו **מוכיחים** את זה.
4. **דירוג** בצירי-איכות ה-DNA (hook/specificity/structure/brevity/register, שוברי-שוויון title/id) → **shortlist של 4** (המספר של פומלי) עם CTA אורגני-פר-מטרה (6 המטרות של פומלי, ניסוח-Steem — אפס-מסילות-תשלום).

**OBSERVE-ONLY** — לעולם לא שער: spamgate (R243) + R297 + R301 + R302 הם בעלי-שערי-הפרסום. החוק-החי בדופק (נגד דפוס built-but-not-running של R312): צעד `content-concepts` ב-`ci-cycle.mjs` → `state/concepts-latest.json` רוכב על קומיטי-ה-state + מפתחות `contentConcepts/contentConceptsTop` ב-CI-HEARTBEAT.

## 4. קבלות

- steem `c7f33fc6d` — selftest **1365/1365** (+10 וקטורים: דטרמיניזם, כל-וטו יורה, empty/all-vetoed/fallback כנים, memoryAvailable כנה; תיקון-וקטור 31.5 שנתפס-עצמאית: kept=5 > shortlist=4 חתך את c1)
- עשן-חי: קורפוס אמיתי 49 רשומות → **kept 49, vetoed 0** (קורפוס-נקי = דירוג-טהור; הוטואים מוכחים-ירייה ב-selftest), shortlist מדורג 70.5 ("Learning in Public: The First Ten Deliberate Hours")
- author `saos-content-agent@agents.roshpinacare-sys` (חוקי #10) · push-מאומת: `git ls-remote` = `c7f33fc6d54d` = HEAD מקומי

## 5. תור-הגל-הבא (מנומק, לא רשימת-משאלות)

1. **צריכת-ה-shortlist** — content-compiler/army-social מזדיינים על ראש-הסולם במקום סדר-קורפוס; אכיפה אחרי-עדות-דופק-מדודה (דפוס-R302: observe → enforce).
2. **דוח-סטיית-DNA** — חילוץ-דו-ערוצי (דפוס brand-analyzer) על עמודי-ה-Domain שלנו → הצעת-רענון לקובץ-החתום; יישום owner-gated.
3. **מגבלות-פורמט פר-עמדת-תצוגה** (דפוס platforms.ts) — lint פר-ממשק למירור רב-חזיתי (שכנות ל-R300).
4. **hermoso** — נבחן-מחדש רק עם מסילת-פרסום-ממומן קיימת (owner-gated, §3).
