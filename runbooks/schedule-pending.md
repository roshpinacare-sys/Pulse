# Runbook: schedule-pending (הלוח של GitHub לא מנחית ריצות-scheduled)

**תסמין**: `*/30` cron רשום ב-workflow, אבל כל הריצות event=workflow_dispatch. tick-ים עוברים בלי ריצה.

**אבחון**: cadence ב-state/network.json — scheduleStatus=pending-first-fire + covered. GitHub schedule = best-effort (תיעוד רשמי): רישום-לוחות לריפואים חדשים מתעכב, עומס מדלג tick-ים. אין דרך לכפות.

**תיקון**: אין תיקון-כפייה. הכיסוי: הזנחת-הטריגר כאמת-מידה (DECISIONS #8) — ה-SLA הוא טריות-ה-state (90 דק'), והוא מכוסה ב-dispatch. כשריצת schedule ראשונה תנחת, cadence יעלה ל-firing מעצמו.

**שדרוג T-72 (DECISIONS #9)**: self-relay — כל ריצה מוצלחת ישנה עד גבול חצי-השעה ומציתה את הטיק הבא מעצמה (heartbeat.yml, step `relay`). תוצאה: הלוח של GitHub והסנדבוקס הפכו לשעוני-גיבוי; האיבר נושא את השעון שלו. התסמין הזה כבר לא משבית כלום.

**הסלמה**: אם covered=false (אין ריצה מסוג-שהוא ב-90 דק') — זו השתקה אמיתית: terminal=degraded + alert issue (חוק-הלולאה). טריגר-ידני: dispatch אחד (PROMPTS.md §5).
