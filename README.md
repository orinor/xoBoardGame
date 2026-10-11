# xoBoardGame

משחק איקס עיגול ב-Angular. תוצאות המשחקים נשמרות בקובץ JSON מבני: `results/game-results.json`.

## הרצה

```
npm install
npm run server   # שרת שמירת תוצאות (פורט 3000)
npm start        # אפליקציית Angular (http://localhost:4200)
```

## מבנה קובץ התוצאות

```json
{ "games": [ { "id": 1, "playedAt": "ISO date", "result": "X | O | draw", "moves": [ { "player": "X", "cell": 0 } ] } ] }
```

`cell` הוא אינדקס 0–8 בלוח.
