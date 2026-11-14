import { X } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { VerifBadge, acctName } from './ui.jsx';
import { dt } from '../lib/format.js';

export default function EvidenceDrawer() {
  const { drawer, setDrawer, data, status } = useStore();
  if (!drawer) return null;
  const ev = data?.evidence.find((e) => e.id === drawer);
  const fetchedAt = ev && status?.fetchedAt?.[ev.tool];
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setDrawer(null)}>
      <aside className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-navy-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div><div className="text-xs uppercase tracking-wide text-slate-400">Evidence</div><div className="break-all font-mono text-sm text-brand-400">{drawer}</div></div>
          <button className="btn-ghost !p-1.5" onClick={() => setDrawer(null)} aria-label="Close"><X size={16} /></button>
        </div>
        {!ev ? <p className="text-sm text-slate-400">This ID is not in the current evidence library (it may have been removed by a later sync).</p> : (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-3 gap-y-2">
              <dt className="text-slate-400">Type</dt><dd className="col-span-2">{ev.type}</dd>
              <dt className="text-slate-400">Account</dt><dd className="col-span-2">{ev.accountId ? acctName(data, ev.accountId) : '—'}</dd>
              <dt className="text-slate-400">Source tool</dt><dd className="col-span-2 font-mono text-xs">{ev.source}</dd>
              <dt className="text-slate-400">Retrieved</dt><dd className="col-span-2">{dt(fetchedAt)}</dd>
              <dt className="text-slate-400">Status</dt><dd className="col-span-2"><VerifBadge s={ev.status} /></dd>
              {ev.basis && (<><dt className="text-slate-400">Why this status</dt><dd className="col-span-2">{ev.basis}</dd></>)}
              <dt className="text-slate-400">Locator</dt><dd className="col-span-2 font-mono text-xs">{ev.locator}</dd>
            </dl>
            <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Description</div><p className="text-slate-200">{ev.description}</p></div>
            {ev.support?.length > 0 && (
              <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Supporting records</div>
                {ev.support.map((s) => (
                  <div key={s.evidenceId} className="mb-2 rounded-lg border border-white/5 bg-navy-800 p-2">
                    <button className="font-mono text-xs text-brand-400 underline" onClick={() => setDrawer(s.evidenceId)}>{s.evidenceId}</button>
                    <span className="ml-2 text-xs text-slate-400">{s.via}</span>
                    {s.snippet && <p className="mt-1 text-xs italic text-slate-300">{s.snippet}</p>}
                  </div>))}
              </div>)}
            <div><div className="mb-1 text-xs uppercase tracking-wide text-slate-400">Raw MCP record (as stored)</div>
              <pre className="max-h-96 overflow-auto rounded-lg bg-navy-950 p-3 text-xs text-slate-300">{JSON.stringify(ev.rawRecord ?? null, null, 2)}</pre></div>
          </div>
        )}
      </aside>
    </div>
  );
}
