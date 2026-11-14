import './env.js';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { db, kvGet, kvSet, getLatest } from './db.js';
import { enqueue, queueStatus, onJobDone, tokenConfigured, scrub, READ_TOOLS, MIN_GAP_MS, MCP_URL } from './mcp.js';
import { buildModel } from './analysis.js';
import { normalizeAccounts, normalizeSignals } from './normalize.js';

const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : true }));

const PASSCODE = process.env.WRITE_PASSCODE || '';
// Optional protection for anything that spends MCP calls or writes data.
const guard = (req, res, next) => {
  if (!PASSCODE) return next();
  if (req.get('x-passcode') === PASSCODE) return next();
  res.status(401).json({ error: 'Editing is locked. Enter the access passcode to sync, write notes or edit tasks.' });
};

const loadRaw = () => Object.fromEntries(READ_TOOLS.map((t) => [t, getLatest(t)]).filter(([, v]) => v));
const rows = (sql, ...p) => db.prepare(sql).all(...p);

// --- React to newly retrieved signals: mark affected insights for review ---
onJobDone((job, payload, err) => {
  if (err || job.tool !== 'get_signals') return;
  const raw = loadRaw();
  const accounts = raw.get_my_accounts ? normalizeAccounts(raw.get_my_accounts.payload) : [];
  const signals = normalizeSignals(payload, accounts);
  const flags = kvGet('review_flags', {});
  let fresh = 0;
  const firstEver = db.prepare('SELECT COUNT(*) c FROM signals_seen').get().c === 0;
  for (const s of signals) {
    const exists = db.prepare('SELECT 1 FROM signals_seen WHERE sig_key = ?').get(s.key);
    if (exists) continue;
    db.prepare('INSERT INTO signals_seen(sig_key, first_seen, payload) VALUES(?,?,?)').run(s.key, Date.now(), JSON.stringify(s.raw));
    if (firstEver) continue; // baseline load is not "new"
    fresh++;
    const acct = s.accountId || '_unassigned';
    flags[acct] = { since: Date.now(), reason: `New signal: ${(s.description || s.type || 'event').slice(0, 120)}`, signalKey: s.key };
    const newKeys = kvGet('new_signal_keys', []); newKeys.push(s.key); kvSet('new_signal_keys', newKeys);
  }
  kvSet('review_flags', flags);
  if (fresh) kvSet('update_notice', { at: Date.now(), count: fresh, message: `${fresh} new live event(s) received. Related insights are marked for review; refresh account data when the cooldown allows.` });
});

// --- Status (never calls MCP) ---
app.get('/api/status', (_req, res) => {
  const raw = loadRaw();
  res.json({
    tokenConfigured: tokenConfigured(), locked: Boolean(PASSCODE), endpoint: MCP_URL.replace(/\/\/[^/@]*@/, '//'), minGapMs: MIN_GAP_MS,
    hasData: Boolean(raw.get_my_accounts), fetchedAt: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.fetchedAt])),
    queue: queueStatus(), notice: kvGet('update_notice', null), serverTime: Date.now(),
  });
});

// --- Cached data + analysis (never calls MCP) ---
app.get('/api/data', (_req, res) => {
  const raw = loadRaw();
  const model = buildModel({
    raw, localActions: rows('SELECT * FROM actions ORDER BY id DESC'),
    newSignalKeys: kvGet('new_signal_keys', []), reviewFlags: kvGet('review_flags', {}),
  });
  res.json({ ...model, localActions: rows('SELECT * FROM actions ORDER BY (status = \'done\'), due IS NULL, due'), notes: rows('SELECT * FROM note_log ORDER BY id DESC LIMIT 100'), sync: { lastSuccessAt: kvGet('last_success_at', null), byTool: kvGet('last_success_by_tool', {}), lastError: kvGet('last_error', null) } });
});

// Raw stored response for inspection (judges can verify any number). Token is never stored.
app.get('/api/raw/:tool', (req, res) => {
  if (!READ_TOOLS.includes(req.params.tool)) return res.status(404).json({ error: 'unknown tool' });
  const r = getLatest(req.params.tool);
  if (!r) return res.status(404).json({ error: 'No cached response yet' });
  res.json({ tool: req.params.tool, fetchedAt: r.fetchedAt, payload: r.payload });
});

// --- Sync (queued; spaced 60s apart by the queue) ---
app.post('/api/sync', guard, (req, res) => {
  if (!tokenConfigured()) return res.status(503).json({ error: 'AQ_TOKEN is not configured on the server.' });
  const tools = Array.isArray(req.body?.tools) && req.body.tools.length ? req.body.tools.filter((t) => READ_TOOLS.includes(t)) : ['get_my_accounts', 'get_data_format', 'get_all_paperwork', 'get_signals'];
  const jobs = tools.map((t) => enqueue(t, {}, { kind: 'sync' }));
  res.status(202).json({ queued: jobs.map((j) => ({ id: j.id, tool: j.tool })), estimatedSeconds: Math.round((queueStatus().cooldownRemainingMs + (jobs.length - 1) * MIN_GAP_MS) / 1000) });
});

app.post('/api/refresh/:tool', guard, (req, res) => {
  if (!READ_TOOLS.includes(req.params.tool)) return res.status(404).json({ error: 'unknown tool' });
  if (!tokenConfigured()) return res.status(503).json({ error: 'AQ_TOKEN is not configured on the server.' });
  const job = enqueue(req.params.tool, {}, { kind: 'manual' });
  res.status(202).json({ queued: { id: job.id, tool: job.tool }, cooldownRemainingMs: queueStatus().cooldownRemainingMs });
});

app.post('/api/review/clear', guard, (req, res) => {
  const { accountId } = req.body || {};
  const flags = kvGet('review_flags', {}); if (accountId) delete flags[accountId]; else Object.keys(flags).forEach((k) => delete flags[k]);
  kvSet('review_flags', flags); kvSet('new_signal_keys', []); kvSet('update_notice', null);
  res.json({ ok: true });
});

// --- write_note: queued; success is only recorded when MCP confirms ---
app.post('/api/notes', guard, (req, res) => {
  const { account, kind, title, text } = req.body || {};
  if (!account || !kind || !title || !text) return res.status(400).json({ error: 'account, kind, title and text are required.' });
  if (!tokenConfigured()) return res.status(503).json({ error: 'AQ_TOKEN is not configured on the server.' });
  const info = db.prepare('INSERT INTO note_log(account,kind,title,text,status,created_at) VALUES(?,?,?,?,?,?)').run(account, kind, title, text, 'queued', Date.now());
  const noteId = Number(info.lastInsertRowid);
  const job = enqueue('write_note', { account, kind, title, text }, { kind: 'write', noteId });
  job.noteId = noteId;
  res.status(202).json({ noteId, queuePosition: queueStatus().queued.length, cooldownRemainingMs: queueStatus().cooldownRemainingMs });
});
onJobDone((job, payload, err) => {
  if (job.tool !== 'write_note') return;
  const id = job.meta?.noteId; if (!id) return;
  const softFail = !err && payload && typeof payload === 'object' && !Array.isArray(payload) && (payload.ok === false || payload.success === false || payload.error);
  if (err || softFail) db.prepare('UPDATE note_log SET status=?, error=?, response=?, completed_at=? WHERE id=?').run('failed', scrub(err ? err.message : 'MCP responded but did not confirm success'), softFail ? scrub(JSON.stringify(payload)) : null, Date.now(), id);
  else db.prepare('UPDATE note_log SET status=?, response=?, completed_at=? WHERE id=?').run('confirmed', scrub(JSON.stringify(payload)), Date.now(), id);
});
// While a note is waiting for the queue, show "sending" once it starts
setInterval(() => {
  const q = queueStatus();
  if (q.running?.tool === 'write_note') { const n = db.prepare("SELECT id FROM note_log WHERE status='queued' ORDER BY id LIMIT 1").get(); if (n) db.prepare("UPDATE note_log SET status='sending' WHERE id=?").run(n.id); }
}, 1000).unref();

// --- Local CRM action plans (separate from game actions) ---
const ACTION_FIELDS = ['account', 'title', 'owner', 'due', 'deal', 'evidence', 'status', 'source'];
app.post('/api/actions', guard, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'title is required' });
  const now = Date.now();
  const info = db.prepare('INSERT INTO actions(account,title,owner,due,deal,evidence,status,source,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(b.account || null, b.title, b.owner || null, b.due || null, b.deal || null, b.evidence || null, b.status || 'todo', b.source || 'manual', now, now);
  res.status(201).json(db.prepare('SELECT * FROM actions WHERE id=?').get(Number(info.lastInsertRowid)));
});
app.patch('/api/actions/:id', guard, (req, res) => {
  const sets = ACTION_FIELDS.filter((f) => f in (req.body || {}));
  if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
  db.prepare(`UPDATE actions SET ${sets.map((f) => f + '=?').join(',')}, updated_at=? WHERE id=?`).run(...sets.map((f) => req.body[f]), Date.now(), Number(req.params.id));
  res.json(db.prepare('SELECT * FROM actions WHERE id=?').get(Number(req.params.id)));
});
app.delete('/api/actions/:id', guard, (req, res) => { db.prepare('DELETE FROM actions WHERE id=?').run(Number(req.params.id)); res.json({ ok: true }); });

// --- Optionally serve the built frontend (single-host deployments) ---
const dist = path.resolve(process.env.CLIENT_DIST || '../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html'))); }

app.use((err, _req, res, _next) => { console.error(scrub(err?.message)); res.status(500).json({ error: 'Internal error' }); });

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Account Quest API on :${port} | token configured: ${tokenConfigured()} | endpoint: ${MCP_URL} | gap ${MIN_GAP_MS}ms`);
  // One-time bootstrap on an empty cache (e.g. fresh disk on a free host). Not polling.
  const empty = !getLatest('get_my_accounts');
  if (empty && tokenConfigured() && process.env.AUTO_SYNC_ON_EMPTY !== 'false') {
    ['get_my_accounts', 'get_data_format', 'get_all_paperwork', 'get_signals'].forEach((t) => enqueue(t, {}, { kind: 'bootstrap' }));
  }
});
