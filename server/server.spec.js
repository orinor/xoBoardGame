const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { createResultsServer } = require('./server');

const game = {
  playedAt: '2026-10-11T11:40:15.312Z',
  result: 'X',
  playerX: 'אורי',
  playerO: "דנה O'Brien",
  moves: [
    { player: 'X', cell: 0 },
    { player: 'O', cell: 4 },
    { player: 'X', cell: 1 },
    { player: 'O', cell: 7 },
    { player: 'X', cell: 2 },
  ],
};

test('SQLite API preserves names, migrates once, persists and clears results', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'xo-sqlite-'));
  const options = {
    dbPath: path.join(directory, 'results.sqlite'),
    legacyPath: path.join(directory, 'results.json'),
  };
  const { playerX, playerO, ...legacy } = game;
  fs.writeFileSync(options.legacyPath, JSON.stringify({ games: [{ id: 1, ...legacy }] }));
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true });
  });
  const start = async () => {
    server = createResultsServer(options);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}/api/results`;
  };
  const stop = () => new Promise((resolve) => server.close(resolve));
  let url = await start();
  const migrated = await (await fetch(url)).json();
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].playerX, 'לא ידוע');
  assert.deepEqual(migrated[0].moves, game.moves);

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ ...game, playerX: `  ${playerX}  ` }),
  });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 2, ...game });

  for (const invalid of [
    { ...game, playerX: ' ' },
    { ...game, playerO: 'a'.repeat(81) },
    { ...game, playedAt: 'invalid' },
    { ...game, moves: [{ player: 'X', cell: 9 }] },
    null,
  ]) {
    const rejected = await fetch(url, { method: 'POST', body: JSON.stringify(invalid) });
    assert.equal(rejected.status, 400);
  }
  assert.equal((await fetch(url, { method: 'POST', body: '{' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', body: 'x'.repeat(100001) })).status, 413);
  await stop();
  assert.equal(fs.readFileSync(options.dbPath).subarray(0, 16).toString(), 'SQLite format 3\0');
  url = await start();
  const persisted = await (await fetch(url)).json();
  assert.equal(persisted.length, 2);
  assert.deepEqual(persisted[1], { id: 2, ...game });
  assert.equal((await fetch(url, { method: 'DELETE' })).status, 200);
  await stop();
  url = await start();
  assert.deepEqual(await (await fetch(url)).json(), []);
  const afterClear = await fetch(url, { method: 'POST', body: JSON.stringify(game) });
  assert.equal((await afterClear.json()).id, 3);
});

test('invalid legacy data fails visibly instead of losing results', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'xo-sqlite-invalid-'));
  try {
    const legacyPath = path.join(directory, 'results.json');
    fs.writeFileSync(legacyPath, '{');
    assert.throws(() => createResultsServer({
      dbPath: path.join(directory, 'results.sqlite'),
      legacyPath,
    }), SyntaxError);
    assert.equal(fs.readFileSync(legacyPath, 'utf8'), '{');
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
