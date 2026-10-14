# Pulse — איבר-הדופק של הרשת · the fleet's autonomous heartbeat organ

[![SAOS office](https://roshpinacare-sys.github.io/Domain/badge/office.svg)](https://roshpinacare-sys.github.io/Domain/office3d/)
[![SAOS fleet](https://roshpinacare-sys.github.io/Domain/badge/fleet.svg)](https://roshpinacare-sys.github.io/Domain/status/)
[![steem-edge](https://roshpinacare-sys.github.io/Domain/badge/edge.svg)](https://roshpinacare-sys.github.io/Domain/money.html)


> **הבעיה שהאיבר הזה פותר**: עד היום כל פעילות הרשת קרתה רק כשסשן-סוכן היה ער.
> git הוא אחסון פסיבי — הוא לא פועם מעצמו. Pulse הוא התשובה ההנדסית: הלולאה רצה
> **על תשתית GitHub עצמה** (Actions על ריפו ציבורי = דקות-חינם אינסופיות), כל 30 דקות,
> לנצח, בלי תלות בשום סנדבוקס, שום סשן, שום סוכן.

## מה זה עושה בפועל (לולאת loop-doctor)

```
schedule (*/30) ──▶ probe.mjs ──▶ state/network.json ──▶ git commit (הקבלה נראית ב-git log)
  ▲                    │
  │   observe: census חי של כל הצי (דינמי — ריפו חדש נכנס אוטומטית)
  │   act: מחשב טריות, בריאות-PAT, ספירות
  │   terminal: success / degraded / blocked (מדווח, לא שקט)
  │   alert: degraded ⇒ Issue (fail-closed, אף פעם לא שתיקה)
  └── repository_dispatch (pulse|task) ◀── טריגר חיצוני (בעלים/סוכן, בלי סנדבוקס)
```

## קבצים

| קובץ | תפקיד |
|------|-------|
| `.github/workflows/heartbeat.yml` | הלולאה (cron + dispatch) |
| `scripts/probe.mjs` | גוף-הלולאה (observe→act→record→terminal) |
| `state/network.json` | **האמת החיה של הצי** — census מלא, טריות, בריאות-PAT |
| `state/history.jsonl` | לדג' הדופק (3000 ריצות אחרונות ≈ 62 ימים) |
| `mirror/lanes.json` | **המראה הציבורית** — רישומי-lane מדרגה-ציבורית שהואפלו ע"י פריטת-Sandbox של T-66, נישאים חזרה לאור ע"י CI (פאנלי Domain חיים ממנו) |
| `BOOTSTRAP.md` | איך סוכן חדש נכנס מאפס — הרשת מתארת את עצמה |
| `PROMPTS.md` | ספריית-פרומטים לבעלים ולסוכנים |
| `DECISIONS.md` | פרוטוקול + יומן ההחלטות של הריבונות |

## סיווג (PUBLISH-POLICY)

§7 runner-shell: **ציבורי + מחוטא**. ה-state נושא שמות-ריפו + חותמות-זמן בלבד
(עקבי עם הפנים-הציבוריות הקיימות ב-FleetHQ). אין סודות, אין תכולה, אין מפתחות.
`FLEET_TOKEN` חי כ-Actions secret מוצפן — לעולם לא בקוד, בלוג, או state.

## כנות — מה זה לא עושה

- לא מריץ משימות עצמאיות — מודד, רושם, ומתריע. ביצוע-משימות = סוכנים דרך תור-המשימות.
- schedule של GitHub יכול להתעכב תחת עומס (state רושם מציאות, לא כוונה).
- אם Actions ינוטרל ידנית או שהריפו יהפוך פרטי — הדופק ימות. (איסור מפורש בחוקים.)
