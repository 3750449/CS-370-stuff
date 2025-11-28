// db.js  (SQLite; better-sqlite3)
const Database = require('better-sqlite3');
const dbfile = process.env.SQLITE_FILE || 'studylink.db';
const sqlite = new Database(dbfile);

// ensure table exists
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title     TEXT NOT NULL,
    course    TEXT NOT NULL,
    content   TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

module.exports = {
  async all(sql, params = []) {
    return sqlite.prepare(sql).all(...params);
  },
  async run(sql, params = []) {
    const info = sqlite.prepare(sql).run(...params);
    return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
  },
};
