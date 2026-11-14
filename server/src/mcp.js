import './env.js';
import { db, kvGet, kvSet, saveRaw } from './db.js';

const OFFICIAL = 'https://questathon.aihackerscollective.com/api/public/mcp';
export const MCP_URL = process.env.MCP_URL || OFFICIAL;
const isOfficial = MCP_URL === OFFICIAL;
// Against the official endpoint the 60s gap is enforced and cannot be lowered.
const requested = Number(process.env.MCP_MIN_GAP_MS || 60000);
export const MIN_GAP_MS = isOfficial ? Math.max(60000, requested) : requested;

export const TOOLS = ['get_my_accounts', 'get_data_format', 'get_all_paperwork', 'get_signals', 'write_note'];
export const READ_TOOLS = ['get_my_accounts', 'get_data_format', 'get_all_paperwork', 'get_signals'];

const token = () => process.env.AQ_TOKEN || '';
export const tokenConfigured = () => token().length > 0;

// Never let the token reach logs, errors or API responses.
export const scrub = (value) => {
  let s = typeof value === 'string' ? value : String(value ?? '');
  const t = token();
  if (t) s = s.split(t).join('[redacted]');
  return s.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]');
};

/** Parse a response that may be plain JSON or text/event-stream. */
export function parseMcpBody(contentType, bodyText, id) {
  if ((contentType || '').includes('text/event-stream')) {
    const messages = [];
    for (const block of bodyText.split(/\r?\n\r?\n/)) {
      const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
      if (!data) continue;
      try { messages.push(JSON.parse(data)); } catch { /* ignore non-JSON events */ }
    }
    const match = messages.find((m) => m && m.id === id && (m.result !== undefined || m.error)) ||
      messages.find((m) => m && (m.result !== undefined || m.error));
    if (!match) throw new Error('No JSON-RPC result found in event stream');
    return match;
  }
  try { return JSON.parse(bodyText); } catch { throw new Error('MCP server returned a non-JSON body'); }
}

/** Turn a JSON-RPC tools/call envelope into the tool's actual payload. */
export function unwrapResult(message) {
  if (message.error) throw new Error(`MCP error ${message.error.code ?? ''}: ${message.error.message ?? 'unknown'}`);
  const result = message.result;
  if (result === undefined) throw new Error('MCP response had no result');
  const texts = Array.isArray(result.content)
    ? result.content.filter((c) => c && c.type === 'text' && typeof c.text === 'string').map((c) => c.text)
    : [];
  if (result.isError) throw new Error(texts.join(' ').slice(0, 500) || 'MCP tool reported an error');
  if (result.structuredContent !== undefined) return result.structuredContent;
  if (texts.length === 1) { try { return JSON.parse(texts[0]); } catch { return texts[0]; } }
  if (texts.length > 1) {
    const parsed = texts.map((t) => { try { return JSON.parse(t); } catch { return t; } });
    return parsed;
  }
  return result;
}

let rpcId = 0;
async function callOnce(tool, args) {
  const id = ++rpcId;
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: tool, arguments: args || {} } }),
    signal: AbortSignal.timeout(45000),
  });
  const text = await res.text();
  if (res.status === 429) {
    const e = new Error('Rate limited by MCP server (429)');
    e.rateLimited = true;
    e.retryAfterMs = Number(res.headers.get('retry-after')) * 1000 || MIN_GAP_MS;
    throw e;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${scrub(text).slice(0, 300)}`);
  return { payload: unwrapResult(parseMcpBody(res.headers.get('content-type'), text, id)) };
}

// ---------- Serialized queue + persisted 60s limiter ----------
const jobs = [];            // queued jobs
const history = [];         // recent finished jobs (for UI)
let running = null;
let working = false;
let jobSeq = 0;
const listeners = new Set();
export const onJobDone = (fn) => listeners.add(fn);

const lastCallAt = () => kvGet('mcp_last_call_at', 0);
export const cooldownRemainingMs = () => Math.max(0, lastCallAt() + MIN_GAP_MS - Date.now());

export function queueStatus() {
  return {
    cooldownRemainingMs: cooldownRemainingMs(),
    minGapMs: MIN_GAP_MS,
    running: running && { id: running.id, tool: running.tool, kind: running.kind },
    queued: jobs.map((j) => ({ id: j.id, tool: j.tool, kind: j.kind })),
    recent: history.slice(-12).reverse(),
    lastSuccessAt: kvGet('last_success_at', null),
    lastSuccessByTool: kvGet('last_success_by_tool', {}),
    lastError: kvGet('last_error', null),
  };
}

export function enqueue(tool, args = {}, meta = {}) {
  if (!TOOLS.includes(tool)) throw new Error(`Unknown tool ${tool}`);
  // Don't stack duplicate read refreshes
  if (tool !== 'write_note') {
    const dup = jobs.find((j) => j.tool === tool) || (running && running.tool === tool ? running : null);
    if (dup) return dup;
  }
  const job = { id: ++jobSeq, tool, args, kind: meta.kind || 'refresh', meta, status: 'queued', queuedAt: Date.now(), retried: false };
  jobs.push(job);
  pump();
  return job;
}

async function pump() {
  if (working) return;
  working = true;
  try {
    while (jobs.length) {
      const job = jobs[0];
      if (!tokenConfigured()) {
        jobs.shift();
        finish(job, null, new Error('AQ_TOKEN is not configured on the server'));
        continue;
      }
      const wait = cooldownRemainingMs();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait + 50));
      jobs.shift();
      running = job; job.status = 'running';
      kvSet('mcp_last_call_at', Date.now()); // counts even if the call fails
      try {
        const { payload } = await callOnce(job.tool, job.args);
        finish(job, payload, null);
      } catch (err) {
        if (err.rateLimited && !job.retried) {
          job.retried = true; job.status = 'queued';
          kvSet('mcp_last_call_at', Date.now() + Math.max(0, err.retryAfterMs - MIN_GAP_MS));
          jobs.unshift(job); running = null;
          continue;
        }
        finish(job, null, err);
      }
      running = null;
    }
  } finally { working = false; running = null; }
}

function finish(job, payload, err) {
  const at = Date.now();
  job.finishedAt = at;
  db.prepare('INSERT INTO mcp_log(tool,at,ok,error) VALUES(?,?,?,?)').run(job.tool, at, err ? 0 : 1, err ? scrub(err.message) : null);
  if (err) {
    job.status = 'error'; job.error = scrub(err.message);
    kvSet('last_error', { tool: job.tool, at, message: job.error });
  } else {
    job.status = 'done';
    if (job.tool !== 'write_note') saveRaw(job.tool, job.args, payload, at);
    kvSet('last_success_at', at);
    kvSet('last_success_by_tool', { ...kvGet('last_success_by_tool', {}), [job.tool]: at });
  }
  history.push({ id: job.id, tool: job.tool, kind: job.kind, status: job.status, error: job.error, at });
  if (history.length > 50) history.shift();
  for (const fn of listeners) { try { fn(job, payload, err); } catch (e) { console.error('listener error', scrub(e.message)); } }
}
