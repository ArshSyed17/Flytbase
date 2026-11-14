import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, Network, KanbanSquare, HelpCircle, FileSearch, ListChecks, Radio, NotebookPen, RefreshCw, Timer, Lock, BellRing, AlertTriangle, X } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { api, getPasscode, setPasscode } from '../lib/api.js';
import { dt, mmss } from '../lib/format.js';
import EvidenceDrawer from './EvidenceDrawer.jsx';

const NAV = [
  ['/', 'Overview', LayoutDashboard], ['/questions', 'Five Questions', HelpCircle], ['/accounts', 'Accounts', Building2],
  ['/power', 'Power Map', Network], ['/pipeline', 'Deal Pipeline', KanbanSquare], ['/evidence', 'Evidence', FileSearch],
  ['/planner', 'Action Planner', ListChecks], ['/events', 'Live Events', Radio], ['/notes', 'Notes → Game', NotebookPen],
];

export default function Layout() {
  const { status, data, cooldownMs, reloadStatus, reload, error } = useStore();
  const [msg, setMsg] = useState(null);
  const [pass, setPass] = useState(getPasscode());
  const q = status?.queue;
  const busy = q && (q.running || q.queued.length > 0);

  const act = async (fn) => {
    try { setMsg(null); await fn(); await reloadStatus(); } catch (e) { setMsg(e.message); }
  };
  const needsPass = status?.locked && !getPasscode();

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden lg:flex-row">
      <aside className="min-w-0 max-w-full border-b border-white/5 bg-navy-900 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">AQ</div>
          <div className="leading-tight"><div className="text-sm font-bold tracking-wide text-white">ACCOUNT QUEST</div><div className="text-[11px] text-slate-400">Customer Success Intelligence CRM</div></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-brand-600/20 text-brand-400' : 'text-slate-300 hover:bg-white/5'}`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="w-full min-w-0 max-w-full flex-1">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-navy-950/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
            <span>Last MCP sync: <b className="text-slate-200">{dt(q?.lastSuccessAt)}</b></span>
            <span className="flex items-center gap-1"><Timer size={14} />
              {busy ? <b className="text-brand-400">{q.running ? `Calling ${q.running.tool}…` : `${q.queued.length} queued`}{q.queued.length && q.running ? ` · ${q.queued.length} waiting` : ''}</b> : null}
              {cooldownMs > 0 ? <span>next MCP call in <b className="font-mono text-amber-300">{mmss(cooldownMs)}</b></span> : <span className="text-emerald-300">MCP ready</span>}
            </span>
            {status && !status.tokenConfigured && <span className="flex items-center gap-1 text-red-300"><AlertTriangle size={14} />AQ_TOKEN not set on server</span>}
            <div className="ml-auto flex items-center gap-2">
              {status?.locked && (
                <label className="flex items-center gap-1"><Lock size={14} /><input type="password" value={pass} placeholder="Access passcode" onChange={(e) => { setPass(e.target.value); setPasscode(e.target.value); }} className="input !w-36 !py-1 text-xs" /></label>
              )}
              <button className="btn-primary !py-1.5 text-xs" disabled={busy || needsPass || !status?.tokenConfigured} onClick={() => act(() => api.sync())} title="Retrieves accounts, schema, paperwork and signals (4 MCP calls, 60s apart)">
                <RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Sync now
              </button>
            </div>
          </div>
          {msg && <div className="mt-2 text-xs text-red-300">{msg}</div>}
          {q?.lastError && <div className="mt-2 text-xs text-amber-300">Last MCP error ({q.lastError.tool}, {dt(q.lastError.at)}): {q.lastError.message}. Showing last cached data.</div>}
          {error && data && <div className="mt-2 text-xs text-amber-300">Backend not reachable ({error}). Showing data already loaded in this page.</div>}
          {status?.notice && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs text-brand-400">
              <BellRing size={14} className="mt-0.5 shrink-0" /><span className="flex-1">{status.notice.message}</span>
              <button className="underline" onClick={() => act(async () => { await api.clearReview(); await reload(); })}>Mark reviewed</button>
            </div>
          )}
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
        <footer className="px-6 pb-8 text-center text-[11px] text-slate-500">Data from the Questathon MCP server, cached server-side. Insights are rule-based recommendations; evidence IDs link to the stored source record.</footer>
      </div>
      <EvidenceDrawer />
    </div>
  );
}
