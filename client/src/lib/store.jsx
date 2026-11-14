import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null); // evidence id to inspect
  const [offset, setOffset] = useState(0);    // server clock offset for accurate countdowns
  const [now, setNow] = useState(Date.now());
  const lastFetch = useRef('');

  const loadData = useCallback(async () => {
    try { setData(await api.data()); setError(null); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  // Polls OUR backend status only (never MCP). Reloads data when a new MCP sync landed.
  const loadStatus = useCallback(async () => {
    try {
      const s = await api.status();
      setStatus(s); setOffset(s.serverTime - Date.now()); setError(null);
      const sig = JSON.stringify([s.fetchedAt, s.queue.lastSuccessAt, s.queue.recent[0]?.id]);
      if (sig !== lastFetch.current) { lastFetch.current = sig; loadData(); }
    } catch (e) { setError(e.message); setLoading(false); }
  }, [loadData]);

  useEffect(() => { loadStatus(); const t = setInterval(loadStatus, 5000); return () => clearInterval(t); }, [loadStatus]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const cooldownMs = useMemo(() => {
    if (!status) return 0;
    const q = status.queue;
    const base = q.cooldownRemainingMs - (now - (status.serverTime - offset));
    return Math.max(0, base);
  }, [status, now, offset]);

  const value = { data, status, error, loading, reload: loadData, reloadStatus: loadStatus, cooldownMs, now: now + offset, drawer, setDrawer };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
