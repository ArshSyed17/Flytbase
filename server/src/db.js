import './env.js';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dbPath = process.env.DB_PATH || path.resolve('data', 'account-quest.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT);
-- Latest successful RAW response per MCP tool (source of truth)
CREATE TABLE IF NOT EXISTS latest (tool TEXT PRIMARY KEY, fetched_at INTEGER NOT NULL, payload TEXT NOT NULL);
-- History of every raw response (inspectable, never contains the token)
CREATE TABLE IF NOT EXISTS raw_history (id INTEGER PRIMARY KEY AUTOINCREMENT, tool TEXT, args TEXT, fetched_at INTEGER, payload TEXT);
CREATE TABLE IF NOT EXISTS mcp_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tool TEXT, at INTEGER, ok INTEGER, error TEXT);
CREATE TABLE IF NOT EXISTS signals_seen (sig_key TEXT PRIMARY KEY, first_seen INTEGER, payload TEXT);
-- Local CRM tasks: NOT actions completed in the Questathon game
CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT, title TEXT NOT NULL, owner TEXT, due TEXT,
  deal TEXT, evidence TEXT, status TEXT DEFAULT 'todo', source TEXT DEFAULT 'manual',
  created_at INTEGER, updated_at INTEGER
);
CREATE TABLE IF NOT EXISTS note_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, account TEXT, kind TEXT, title TEXT, text TEXT,
  status TEXT, response TEXT, error TEXT, created_at INTEGER, completed_at INTEGER
);
`);

export const kvGet = (key, fallback = null) => {
  const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
};
export const kvSet = (key, value) =>
  db.prepare('INSERT INTO kv(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));

export const saveRaw = (tool, args, payload, at) => {
  const body = JSON.stringify(payload);
  db.prepare('INSERT INTO latest(tool,fetched_at,payload) VALUES(?,?,?) ON CONFLICT(tool) DO UPDATE SET fetched_at=excluded.fetched_at, payload=excluded.payload')
    .run(tool, at, body);
  db.prepare('INSERT INTO raw_history(tool,args,fetched_at,payload) VALUES(?,?,?,?)').run(tool, JSON.stringify(args || {}), at, body);
};

export const getLatest = (tool) => {
  const row = db.prepare('SELECT fetched_at, payload FROM latest WHERE tool = ?').get(tool);
  if (!row) return null;
  try { return { fetchedAt: row.fetched_at, payload: JSON.parse(row.payload) }; } catch { return null; }
};
