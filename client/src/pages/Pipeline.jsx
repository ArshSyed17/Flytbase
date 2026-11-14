import { Badge, Card, EvList, Gate, PageTitle, VerifBadge } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { STAGES, money, stageColor, unknown } from '../lib/format.js';

export default function Pipeline() { return <Gate><Inner /></Gate>; }

function Inner() {
  const { data } = useStore();
  const deals = data.accounts.flatMap((a) => a.deals.map((d) => ({ ...d, accountName: a.name })));
  const cols = [...STAGES, ...(deals.some((d) => !d.stage) ? ['Unknown'] : [])];
  return (
    <>
      <PageTitle title="Deal Pipeline" sub="Stages come only from the data (Identified → Qualified → Blocker Cleared → Agreed). A deal is never advanced without evidence; if the stage is unreadable it sits in Unknown." />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cols.map((s) => {
          const list = deals.filter((d) => (d.stage || 'Unknown') === s);
          return (
            <div key={s} className="card p-3">
              <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold text-slate-100"><i className="h-2.5 w-2.5 rounded-full" style={{ background: stageColor[s] }} />{s}</span><Badge>{list.length}</Badge></div>
              <div className="mb-2 text-xs text-slate-400">{money(list.reduce((t, d) => t + (d.value || 0), 0))}</div>
              <div className="space-y-2">{list.map((d) => (
                <div key={d.key} className="rounded-lg border border-white/5 bg-navy-900 p-2 text-xs">
                  <div className="font-medium text-slate-100">{d.title}</div><div className="text-slate-400">{d.accountName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">{money(d.value, d.currency)} <VerifBadge s={d.valueStatus} />{d.blocked && d.stage !== 'Agreed' && <Badge t="warning">Blocked</Badge>}</div>
                </div>))}
                {!list.length && <p className="text-xs text-slate-500">No deals</p>}</div>
            </div>);
        })}
      </div>

      <Card title="All deals" className="mt-5">
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead><tr>{['Deal', 'Account', 'Value', 'Stage', 'Deadline', 'Blocker', 'Required evidence', 'Decision maker', 'Budget owner', 'Next action', 'Source'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>
          {deals.map((d) => (
            <tr key={d.key} className="border-t border-white/5">
              <td className="td font-medium text-slate-100">{d.title}</td><td className="td">{d.accountName}</td>
              <td className="td">{money(d.value, d.currency)}<div><VerifBadge s={d.valueStatus} /></div></td>
              <td className="td"><Badge t="info">{d.stage || 'Unknown'}</Badge></td><td className="td">{unknown(d.deadline)}</td>
              <td className="td text-xs">{d.blocker ? <span className="text-amber-300">{d.blocker}</span> : 'None recorded'}</td>
              <td className="td text-xs">{unknown(d.requiredEvidence)}</td><td className="td text-xs">{unknown(d.decisionMaker)}</td><td className="td text-xs">{unknown(d.budgetOwner)}</td>
              <td className="td text-xs">{d.nextAction || 'Not in data — see Q3 recommendation'}</td>
              <td className="td"><EvList ids={[d.evidenceId, ...d.support.map((s) => s.evidenceId)]} /></td>
            </tr>))}
          {!deals.length && <tr><td className="td text-slate-400" colSpan={11}>No deals in the cached data.</td></tr>}
        </tbody></table></div>
      </Card>
    </>
  );
}
