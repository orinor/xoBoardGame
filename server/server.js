// שרת קטן ששומר את תוצאות המשחקים בקובץ JSON מבני
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FILE = path.join(__dirname, '..', 'results', 'game-results.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')).games;
  } catch {
    return [];
  }
}

function write(games) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ games }, null, 2), 'utf8');
}

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    if (req.url !== '/api/results') return send(res, 404, { error: 'not found' });

    if (req.method === 'GET') return send(res, 200, read());

    if (req.method === 'DELETE') {
      write([]);
      return send(res, 200, []);
    }

    if (req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => {
        raw += c;
        if (raw.length > 1e5) req.destroy();
      });
      req.on('end', () => {
        try {
          const g = JSON.parse(raw);
          if (!['X', 'O', 'draw'].includes(g.result) || !Array.isArray(g.moves)) {
            return send(res, 400, { error: 'invalid game' });
          }
          const games = read();
          const saved = {
            id: games.length ? games[games.length - 1].id + 1 : 1,
            playedAt: String(g.playedAt),
            result: g.result,
            moves: g.moves.map((m) => ({ player: m.player, cell: Number(m.cell) })),
          };
          games.push(saved);
          write(games);
          send(res, 201, saved);
        } catch {
          send(res, 400, { error: 'bad json' });
        }
      });
      return;
    }

    send(res, 405, { error: 'method not allowed' });
  })
  .listen(PORT, () => console.log(`Results server on http://localhost:${PORT}`));
