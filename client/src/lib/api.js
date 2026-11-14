// The browser only ever talks to OUR backend. The MCP token lives server-side (AQ_TOKEN).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Optional access passcode (NOT the MCP token) that unlocks sync/write actions on a public deployment.
export const getPasscode = () => { try { return sessionStorage.getItem('aq_passcode') || ''; } catch { return ''; } };
export const setPasscode = (v) => { try { sessionStorage.setItem('aq_passcode', v); } catch { /* ignore */ } };

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-passcode': getPasscode(), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json;
}

export const api = {
  status: () => request('/api/status'),
  data: () => request('/api/data'),
  raw: (tool) => request(`/api/raw/${tool}`),
  sync: (tools) => request('/api/sync', { method: 'POST', body: { tools } }),
  refresh: (tool) => request(`/api/refresh/${tool}`, { method: 'POST' }),
  clearReview: (accountId) => request('/api/review/clear', { method: 'POST', body: { accountId } }),
  writeNote: (note) => request('/api/notes', { method: 'POST', body: note }),
  addAction: (a) => request('/api/actions', { method: 'POST', body: a }),
  updateAction: (id, patch) => request(`/api/actions/${id}`, { method: 'PATCH', body: patch }),
  deleteAction: (id) => request(`/api/actions/${id}`, { method: 'DELETE' }),
};
