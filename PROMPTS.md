# PROMPTS.md — ספריית-פרומטים (לבעלים ולסוכנים)

> עקרון: פרומט טוב הוא **פקודה עם קבלה**. כל פרומט כאן מייצר מדידה, לא סיפור.

## לבעלים — הפעלה ידנית של הרשת (בלי סנדבוקס, דקה אחת)

1. פעימה-עכשיו (הרשת תעשה census מלא ותרשום ב-git):
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/repos/roshpinacare-sys/Pulse/dispatches \
     -d '{"event_type":"pulse","client_payload":{"note":"owner manual pulse"}}'
   ```
2. מה קורה עכשיו (בלי טוקן, קריאה בלבד):
   ```bash
   curl -s https://raw.githubusercontent.com/roshpinacare-sys/Pulse/main/state/network.json
   ```
3. תור-המשימות: https://github.com/roshpinacare-sys/Pulse/issues?q=is%3Aissue+label%3Atask

## לבעלים — פרומטים לסשן-סוכן (כשפותחים צ'אט חדש)

- **בוט חדש מאפס**:
  "קרא https://github.com/roshpinacare-sys/Pulse/blob/main/BOOTSTRAP.md, פעל לפיו,
  בצע את המשימות הפתוחות מתווית task לפי סדר, והשאר קבלות ב-git. דווח בעברית."
- **בדיקת-שקט** (האם הרשת חיה):
  "מדוד: מתי רץ ה-heartbeat האחרון ב-Pulse? מתי הדופק הריבוני האחרון? אם מעל ה-SLA —
  תקן ותשאיר קבלה. עברית."
- **סבב-אמת**:
  "הרץ את ה-verifier, עבור על כל הטענות, כל PARTIAL/REFUTED — תת לו תיקון עם קבלה. עברית."

## לסוכנים — משמעת קבועה

- לפני: קרא state/network.json (טרי?) + תור-המשימות.
- במהלך: פעולה אחת חוזרת-אחת, קבלה אחרי כל פעולה, אין כתיבה למה שלא בבעלותך.
- אחרי: עדכון state/issues; דיווח עברית עם run-ids/shas; סופים בעלי-שם בלבד.
