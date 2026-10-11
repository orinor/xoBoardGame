# xoBoardGame

משחק איקס עיגול ב-Angular. בתחילת כל משחק מזינים את שמות שחקני X ו-O.
התוצאות, שמות השחקנים והמהלכים נשמרים במסד SQLite מקומי וחינמי: `results/game-results.sqlite`.
אין צורך בחשבון, בשרת מסד נתונים נפרד או בהתקנת SQLite.

## הרצה

נדרש Node.js 24 ומעלה (השרת משתמש ב-`node:sqlite` המובנה).

```
npm ci
npm run server   # שרת שמירת תוצאות (פורט 3000)
npm start        # אפליקציית Angular (http://localhost:4200)
```

בהפעלה הראשונה מועברות אוטומטית תוצאות קיימות מ-`results/game-results.json` ל-SQLite.
שמות שחקנים במשחקים הישנים יוצגו כ״לא ידוע״. קובץ ה-JSON נשאר כגיבוי, אך אינו מתעדכן עוד.
הייבוא מתבצע פעם אחת בלבד, גם לאחר ניקוי ההיסטוריה. לגיבוי התוצאות החדשות יש לשמור את קובץ ה-SQLite.

## מבנה תוצאה ב-API

```json
{ "id": 1, "playedAt": "ISO date", "playerX": "שם שחקן X", "playerO": "שם שחקן O", "result": "X | O | draw", "moves": [ { "player": "X", "cell": 0 } ] }
```

`cell` הוא אינדקס 0–8 בלוח.
`GET /api/results` מחזיר מערך תוצאות; `POST /api/results` שומר תוצאה עם שני שמות (1–80 תווים אחרי הסרת רווחים בקצוות);
`DELETE /api/results` מנקה את ההיסטוריה.

## בדיקות

```
npm test -- --watch=false
node --test server/server.spec.js
npm run build
```
