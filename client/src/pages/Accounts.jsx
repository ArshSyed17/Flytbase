import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Users } from 'lucide-react';
import { Badge, Card, Empty, EvChip, EvList, Gate, PageTitle, SevBadge, VerifBadge, relTone } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { money, unknown } from '../lib/format.js';

export default function Accounts() { return <Gate><List /></Gate>; }

function List() {
  const { data } = useStore();
  return (
    <>
      <PageTitle title="Customer Accounts" sub="Accounts exactly as returned by get_my_accounts." />
      <div className="grid gap-4 md:grid-cols-2">
        {data.accounts.map((a) => {
          const an = data.analysis.find((x) => x.accountId === a.id);
          return (
            <Link key={a.id} to={`/accounts/${encodeURIComponent(a.id)}`} className="card block p-5 transition hover:border-brand-500/40">
              <div className="flex items-start justify-between gap-2"><div><div className="text-lg font-semibold text-slate-50">{a.name}</div><div className="font-mono text-xs text-slate-400">ID: {a.id}{a.idFromData ? '' : ' (no id in data — derived from name)'}</div></div><SevBadge s={an.health} /></div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-300">{a.overview || 'No overview in account data.'}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><Tile k="Deals" v={a.deals.length} /><Tile k="People" v={a.people.length} /><Tile k="Book" v={money(an.q1.totals.all)} /></div>
            </Link>);
        })}
      </div>
    </>
  );
}
const Tile = ({ k, v }) => <div className="rounded-lg bg-navy-900 p-2"><div className="text-slate-400">{k}</div><div className="text-sm font-semibold text-slate-100">{v}</div></div>;

export function AccountDetail() { return <Gate><Detail /></Gate>; }

function Detail() {
  const { id } = useParams();
  const { data } = useStore();
  const a = data.accounts.find((x) => x.id === id);
  if (!a) return <Empty title="Account not found">No account with ID “{id}” in the cached data. <Link className="underline" to="/accounts">Back to accounts</Link></Empty>;
  const an = data.analysis.find((x) => x.accountId === a.id);
  const docs = data.paperwork.filter((d) => d.accountId === a.id);
  return (
    <>
      <Link to="/accounts" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft size={14} />All accounts</Link>
      <PageTitle title={a.name} sub={`Account ID ${a.id}`} right={<div className="flex items-center gap-2"><SevBadge s={an.health} /><EvChip id={a.evidenceId} /><Link to={`/questions?account=${encodeURIComponent(a.id)}`} className="btn-primary text-xs">Five questions →</Link></div>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Overview" className="lg:col-span-2">
          <p className="text-sm text-slate-300">{a.overview || 'No overview in account data.'}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><K k="Industry" v={unknown(a.industry)} /><K k="Relationship" v={unknown(a.relationshipRaw)} /><K k="Renewal date" v={unknown(a.renewalDate)} /><K k="Book total" v={money(an.q1.totals.all)} /></dl>
          <div className="mt-3 flex flex-wrap gap-1">{an.summary.lines.map((l, i) => <p key={i} className="text-xs text-slate-400">• {l}</p>)}</div>
        </Card>
        <Card title="Risks on the account sheet">
          {a.risks.length ? <ul className="list-disc space-y-1 pl-4 text-sm text-slate-300">{a.risks.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="text-sm text-slate-400">None recorded. See the computed risks in the Five Questions.</p>}
          {a.deadlines.length > 0 && <><div className="mt-3 text-xs uppercase tracking-wide text-slate-400">Deadlines</div><ul className="list-disc pl-4 text-sm text-slate-300">{a.deadlines.map((d, i) => <li key={i}>{d}</li>)}</ul></>}
        </Card>
      </div>

      <Card title="Deals and opportunities" className="mt-4">
        {a.deals.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Deal</th><th className="th">Value</th><th className="th">Stage</th><th className="th">Deadline</th><th className="th">Blocker</th><th className="th">Source</th></tr></thead><tbody>
          {a.deals.map((d) => <tr key={d.key} className="border-t border-white/5"><td className="td font-medium text-slate-100">{d.title}</td><td className="td">{money(d.value, d.currency)} <VerifBadge s={d.valueStatus} /></td><td className="td"><Badge t="info">{d.stage || 'Unknown'}</Badge></td><td className="td">{unknown(d.deadline)}</td><td className="td text-xs">{d.blocker || '—'}</td><td className="td"><EvList ids={[d.evidenceId, ...d.support.map((s) => s.evidenceId)]} /></td></tr>)}
        </tbody></table></div> : <Empty>No deals in account data.</Empty>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="People met & relationship status" icon={Users}>
          {a.people.length ? <ul className="space-y-2">{a.people.map((p) => <li key={p.key} className="rounded-lg bg-navy-900 p-2 text-sm"><div className="flex flex-wrap items-center gap-2"><b className="text-slate-100">{p.name}</b><span className="text-slate-400">{unknown(p.title)}</span><Badge t={relTone[p.relationship || 'Unknown']}>{p.relationship || 'Unknown'}</Badge>{p.met === false && <Badge t="warning">Not met</Badge>}<EvChip id={p.evidenceId} /></div></li>)}</ul> : <Empty>No people in account data.</Empty>}
        </Card>
        <Card title="Supporting paperwork" icon={FileText}>
          {docs.length ? <ul className="space-y-2">{docs.map((d) => <li key={d.evidenceId} className="rounded-lg bg-navy-900 p-2 text-sm"><div className="flex items-center gap-2"><b className="text-slate-100">{d.title}</b>{d.type && <Badge>{d.type}</Badge>}<EvChip id={d.evidenceId} /></div>{d.content && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{d.content}</p>}</li>)}</ul> : <Empty title="No paperwork matched">No paperwork record references this account.</Empty>}
        </Card>
      </div>
    </>
  );
}
const K = ({ k, v }) => <div><dt className="text-xs text-slate-400">{k}</dt><dd className="text-slate-100">{v}</dd></div>;
