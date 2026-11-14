import { Badge, Card, Empty, EvChip, Gate, PageTitle, relTone } from '../components/ui.jsx';
import StakeholderMap, { roleName } from '../components/StakeholderMap.jsx';
import { useStore } from '../lib/store.jsx';
import { unknown } from '../lib/format.js';

export default function PowerMap() { return <Gate><Inner /></Gate>; }

function Inner() {
  const { data } = useStore();
  return (
    <>
      <PageTitle title="Stakeholder Power Map" sub="Only people present in game data or paperwork are shown. Roles are taken from explicit fields or from the decision-maker / budget-owner named on a deal; otherwise they stay Unknown." />
      <div className="space-y-5">
        {data.analysis.map((an) => {
          const acct = data.accounts.find((a) => a.id === an.accountId);
          const roleOf = (p) => an.q2.edges.find((e) => e.name === p.name)?.role || null;
          return (
            <Card key={an.accountId} title={an.name}>
              {acct.people.length === 0 ? <Empty title="No stakeholders recorded">The account data lists no people.</Empty> : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <StakeholderMap account={an.name} people={acct.people} roleOf={roleOf} />
                  <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Person</th><th className="th">Role</th><th className="th">Stance</th><th className="th">Cares about / influence / waiting for</th></tr></thead><tbody>
                    {acct.people.map((p) => {
                      const role = roleOf(p);
                      return (
                        <tr key={p.key} className="border-t border-white/5">
                          <td className="td"><div className="font-medium text-slate-100">{p.name}</div><div className="text-xs text-slate-400">{unknown(p.title)}</div><div className="mt-1"><EvChip id={p.evidenceId} /></div></td>
                          <td className="td"><Badge t={role ? 'info' : 'muted'}>{roleName(role)}</Badge><div className="mt-1 text-[11px] text-slate-400">{role ? 'Verified from data' : 'Still unknown'}{p.met === false ? ' · not met' : ''}</div></td>
                          <td className="td"><Badge t={relTone[p.relationship || 'Unknown']}>{p.relationship || 'Unknown'}</Badge></td>
                          <td className="td text-xs text-slate-300"><div><b className="text-slate-400">Cares: </b>{unknown(p.caresAbout)}</div><div><b className="text-slate-400">Influence: </b>{unknown(p.influence)}</div><div><b className="text-slate-400">Waiting for: </b>{unknown(p.waitingFor)}</div></td>
                        </tr>);
                    })}
                  </tbody></table></div>
                </div>)}
            </Card>);
        })}
      </div>
    </>
  );
}
