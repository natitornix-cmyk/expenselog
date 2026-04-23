const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'expenses.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    description TEXT NOT NULL,
    paid_by     INTEGER NOT NULL REFERENCES members(id),
    notes       TEXT DEFAULT '',
    created_at  TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS expense_splits (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    member_id  INTEGER NOT NULL REFERENCES members(id),
    amount     REAL NOT NULL DEFAULT 0
  );
`);

const { count } = db.prepare('SELECT COUNT(*) as count FROM members').get();
if (count === 0) {
  const insert = db.prepare('INSERT OR IGNORE INTO members (name) VALUES (?)');
  for (const name of ['บูม', 'หนึ่ง', 'โอม', 'ติณห์']) {
    insert.run(name);
  }
}

module.exports = db;
