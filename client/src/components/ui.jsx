import { Loader2, Inbox } from 'lucide-react';
import { useStore } from '../lib/store.jsx';

const tone = {
  critical: 'bg-red-500/15 text-red-300 ring-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  healthy: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  info: 'bg-brand-500/15 text-brand-400 ring-brand-500/30',
  muted: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
};
export const Badge = ({ t = 'muted', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone[t]} ${className}`}>{children}</span>
);

export const sevTone = { critical: 'critical', warning: 'warning', healthy: 'healthy', Critical: 'critical', Warning: 'warning', Healthy: 'healthy' };
export const verifTone = { Verified: 'healthy', Told: 'info', Unverified: 'warning', Unknown: 'muted' };
export const relTone = { Ally: 'healthy', Warm: 'healthy', Neutral: 'info', Guarded: 'warning', Unknown: 'muted' };

export const VerifBadge = ({ s }) => <Badge t={verifTone[s] || 'muted'}>{s || 'Unknown'}</Badge>;
export const SevBadge = ({ s }) => <Badge t={sevTone[s] || 'muted'}>{s === 'healthy' ? 'Healthy' : s === 'critical' ? 'Critical' : s === 'warning' ? 'Warning' : s}</Badge>;

/** Clickable evidence ID that opens the evidence drawer. */
export function EvChip({ id }) {
  const { setDrawer } = useStore();
  if (!id) return null;
  return (
    <button onClick={() => setDrawer(id)} className="rounded border border-brand-500/30 bg-brand-500/10 px-1.5 py-0.5 font-mono text-[11px] text-brand-400 hover:bg-brand-500/20" title="Inspect source">{id}</button>
  );
}
export const EvList = ({ ids = [] }) => <div className="flex flex-wrap gap-1">{[...new Set(ids)].filter(Boolean).map((i) => <EvChip key={i} id={i} />)}</div>;

export const Card = ({ title, icon: Icon, right, children, className = '' }) => (
  <section className={`card p-4 ${className}`}>
    {(title || right) && (
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">{Icon && <Icon size={16} className="text-brand-400" />}{title}</h3>
        {right}
      </header>
    )}
    {children}
  </section>
);

export const Stat = ({ label, value, sub, tone: t }) => (
  <div className="card p-4">
    <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
    <div className={`mt-1 text-2xl font-semibold ${t === 'critical' ? 'text-red-300' : t === 'warning' ? 'text-amber-300' : t === 'healthy' ? 'text-emerald-300' : 'text-slate-50'}`}>{value}</div>
    {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
  </div>
);

export const Empty = ({ children, title = 'Nothing here yet' }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
    <Inbox size={22} /><div className="font-medium text-slate-300">{title}</div><div className="max-w-md">{children}</div>
  </div>
);

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-400"><Loader2 className="animate-spin" size={18} />{label}</div>
);

export const PageTitle = ({ title, sub, right }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">{title}</h1>{sub && <p className="mt-1 max-w-3xl text-sm text-slate-400">{sub}</p>}</div>{right}
  </div>
);

export const Rec = () => <Badge t="info" className="uppercase">Recommendation · not a verified fact</Badge>;

/** Wraps a page so it shows loading / empty-cache states uniformly. */
export function Gate({ children }) {
  const { data, loading, status, error } = useStore();
  if (loading && !data) return <Spinner label="Loading cached CRM data…" />;
  if (error && !data) return <Empty title="Backend unreachable">{error}. The CRM shows the last cached data as soon as the API responds.</Empty>;
  if (!data || !data.accounts.length) {
    const q = status?.queue;
    return (
      <Empty title="No account data cached yet">
        {status && !status.tokenConfigured ? 'The server has no AQ_TOKEN configured. Set it as an environment variable on the backend, then sync.' :
          q && (q.running || q.queued.length) ? 'The first sync is running. MCP allows one call per minute, so all four tools take about four minutes.' :
          'Use “Sync now” in the header to retrieve accounts, schema, paperwork and signals from the Questathon MCP server.'}
      </Empty>
    );
  }
  return children;
}

export const acctName = (data, id) => data?.accounts.find((a) => a.id === id)?.name || id || 'Unassigned';
