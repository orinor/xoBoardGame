const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const RESULTS = path.join(__dirname, '..', 'results');

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function validGame(game) {
  return (
    game !== null &&
    typeof game === 'object' &&
    ['X', 'O', 'draw'].includes(game.result) &&
    typeof game.playedAt === 'string' &&
    Number.isFinite(Date.parse(game.playedAt)) &&
    ['playerX', 'playerO'].every(
      (key) => typeof game[key] === 'string' && game[key].trim().length > 0 && game[key].trim().length <= 80,
    ) &&
    Array.isArray(game.moves) &&
    game.moves.length >= 5 &&
    game.moves.length <= 9 &&
    game.moves.every(
      (move, index) =>
        move !== null &&
        typeof move === 'object' &&
        move.player === (index % 2 === 0 ? 'X' : 'O') &&
        Number.isInteger(move.cell) &&
        move.cell >= 0 &&
        move.cell <= 8,
    ) &&
    new Set(game.moves.map((move) => move.cell)).size === game.moves.length
  );
}

function createResultsServer({
  dbPath = path.join(RESULTS, 'game-results.sqlite'),
  legacyPath = path.join(RESULTS, 'game-results.json'),
} = {}) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        played_at TEXT NOT NULL,
        result TEXT NOT NULL CHECK (result IN ('X', 'O', 'draw')),
        player_x TEXT NOT NULL,
        player_o TEXT NOT NULL,
        moves TEXT NOT NULL CHECK (json_valid(moves))
      );
    `);
    if (db.prepare('PRAGMA user_version').get().user_version === 0) {
      db.exec('BEGIN');
      try {
        if (fs.existsSync(legacyPath)) {
          const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
          if (!Array.isArray(legacy.games)) throw new Error('Invalid legacy results file');
          const insertLegacy = db.prepare(
            'INSERT INTO games (id, played_at, result, player_x, player_o, moves) VALUES (?, ?, ?, ?, ?, ?)',
          );
          for (const entry of legacy.games) {
            const game = { ...entry, playerX: 'לא ידוע', playerO: 'לא ידוע' };
            if (!validGame(game) || !Number.isSafeInteger(game.id) || game.id < 1) {
              throw new Error('Invalid legacy game');
            }
            insertLegacy.run(game.id, game.playedAt, game.result, game.playerX, game.playerO, JSON.stringify(game.moves));
          }
        }
        db.exec('PRAGMA user_version = 1; COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    db.close();
    throw error;
  }

  const select = db.prepare(
    'SELECT id, played_at AS playedAt, result, player_x AS playerX, player_o AS playerO, moves FROM games ORDER BY id',
  );
  const insert = db.prepare(
    'INSERT INTO games (played_at, result, player_x, player_o, moves) VALUES (?, ?, ?, ?, ?)',
  );
  const clear = db.prepare('DELETE FROM games');
  const databaseError = (res, error) => {
    console.error('Results database operation failed:', error);
    send(res, 500, { error: 'database operation failed' });
  };

  const server = http.createServer((req, res) => {
    if (req.url !== '/api/results') return send(res, 404, { error: 'not found' });

    if (req.method === 'GET' || req.method === 'DELETE') {
      try {
        if (req.method === 'DELETE') {
          clear.run();
          return send(res, 200, []);
        }
        return send(res, 200, select.all().map((row) => ({ ...row, moves: JSON.parse(row.moves) })));
      } catch (error) {
        return databaseError(res, error);
      }
    }

    if (req.method === 'POST') {
      let raw = '';
      let bytes = 0;
      let tooLarge = false;
      req.setEncoding('utf8');
      req.on('data', (c) => {
        bytes += Buffer.byteLength(c);
        if (bytes > 1e5) {
          if (!tooLarge) send(res, 413, { error: 'request too large' });
          tooLarge = true;
          return;
        }
        raw += c;
      });
      req.on('end', () => {
        if (tooLarge) return;
        let game;
        try {
          game = JSON.parse(raw);
        } catch {
          return send(res, 400, { error: 'bad json' });
        }
        if (!validGame(game)) return send(res, 400, { error: 'invalid game' });
        try {
          const saved = {
            playedAt: game.playedAt,
            result: game.result,
            playerX: game.playerX.trim(),
            playerO: game.playerO.trim(),
            moves: game.moves.map((m) => ({ player: m.player, cell: m.cell })),
          };
          const { lastInsertRowid } = insert.run(
            saved.playedAt, saved.result, saved.playerX, saved.playerO, JSON.stringify(saved.moves),
          );
          send(res, 201, { id: Number(lastInsertRowid), ...saved });
        } catch (error) {
          databaseError(res, error);
        }
      });
      return;
    }

    send(res, 405, { error: 'method not allowed' });
  });
  server.on('close', () => db.close());
  return server;
}

if (require.main === module) {
  createResultsServer().listen(3000, () => console.log('Results server on http://localhost:3000 (SQLite)'));
}

module.exports = { createResultsServer };
