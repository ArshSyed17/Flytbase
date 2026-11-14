import { useState } from 'react';
import { RefreshCw, Radio } from 'lucide-react';
import { Badge, Card, Empty, EvChip, Gate, PageTitle, acctName } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { dt, mmss } from '../lib/format.js';

export default function Events() { return <Gate><Inner /></Gate>; }

// Rules-based suggestions; clearly labelled as recommendations.
function respond(s) {
  const t = `${s.type || ''} ${s.description || ''}`.toLowerCase();
  if (/delay|slip|postpone|late/.test(t)) return 'Confirm the new date with the account owner and re-check the related deadline.';
  if (/cancel|churn|competitor|escalat/.test(t)) return 'Treat as a renewal risk: contact the decision maker and review the account plan today.';
  if (/meeting|call|email|reply|ask|request/.test(t)) return 'Respond to the request, log the commitment, and add a dated task.';
  if (/sign|agree|approv|won|paid/.test(t)) return 'Verify against paperwork before moving the deal stage.';
  return 'Review the event, decide if any deal, deadline or stakeholder changes, then note it.';
}

function Inner() {
  const { data, status, cooldownMs, reload, reloadStatus } = useStore();
  const [err, setErr] = useState(null);
  const q = status?.queue; const busy = q && (q.running || q.queued.length);
  const refresh = async (tool) => { try { setErr(null); await api.refresh(tool); await reloadStatus(); } catch (e) { setErr(e.message); } };
  const flagged = data.analysis.filter((a) => a.reviewNote);
  return (
    <>
      <PageTitle title="Live Events" sub="Signals from get_signals. Refreshing is queued behind the 1-call-per-minute MCP limit." right={
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Signals fetched: {dt(status?.fetchedAt?.get_signals)}</span>
          <button className="btn-primary" disabled={busy || !status?.tokenConfigured} onClick={() => refresh('get_signals')}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />Refresh events{cooldownMs > 0 && !busy ? ` (${mmss(cooldownMs)})` : ''}</button>
        </div>} />
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      {flagged.length > 0 && (
        <Card title="Insights marked for review" className="mb-4">
          <ul className="space-y-2 text-sm">{flagged.map((a) => <li key={a.accountId} className="flex flex-wrap items-center gap-2"><Badge t="warning">{a.name}</Badge>{a.reviewNote.reason}</li>)}</ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">The cached account sheet may be out of date. <button className="btn-ghost !py-1" disabled={busy} onClick={() => refresh('get_my_accounts')}>Refresh accounts from MCP</button>
            <button className="btn-ghost !py-1" onClick={async () => { await api.clearReview(); reload(); }}>Mark all reviewed</button></div>
        </Card>)}
      <Card title={`Events (${data.signals.length})`} icon={Radio}>
        {data.signals.length === 0 ? <Empty title="No events yet">{status?.fetchedAt?.get_signals ? 'The last get_signals call returned no events.' : 'Signals have not been fetched yet. Use “Refresh events”.'}</Empty> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead><tr><th className="th">New</th><th className="th">Type</th><th className="th">Account</th><th className="th">Description</th><th className="th">Time</th><th className="th">Related deal</th><th className="th">Suggested response</th><th className="th">Source</th></tr></thead><tbody>
            {data.signals.map((s) => (
              <tr key={s.key} className="border-t border-white/5">
                <td className="td">{s.isNew ? <Badge t="info">NEW</Badge> : ''}</td><td className="td"><Badge>{s.type || 'event'}</Badge></td>
                <td className="td text-xs">{s.accountId ? acctName(data, s.accountId) : 'Not specified'}</td><td className="td text-slate-100">{s.description || '—'}</td>
                <td className="td text-xs">{s.timestamp || 'Not supplied'}</td><td className="td text-xs">{s.deal || 'Not specified'}</td>
                <td className="td text-xs text-slate-300">{respond(s)}<div className="mt-1 text-[10px] uppercase text-brand-400">Recommendation</div></td>
                <td className="td"><EvChip id={s.evidenceId} /></td>
              </tr>))}
          </tbody></table></div>)}
      </Card>
    </>
  );
}
