import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Coins, Crown, Flag, ShieldAlert, HelpCircle, BellRing } from 'lucide-react';
import { Badge, Card, Empty, EvList, Gate, PageTitle, Rec, SevBadge, VerifBadge, relTone } from '../components/ui.jsx';
import StakeholderMap, { roleName } from '../components/StakeholderMap.jsx';
import { useStore } from '../lib/store.jsx';
import { money } from '../lib/format.js';
import { api } from '../lib/api.js';

export default function Questions() { return <Gate><Inner /></Gate>; }

function Inner() {
  const { data, reload } = useStore();
  const [sp, setSp] = useSearchParams();
  const activeId = sp.get('account') || data.analysis[0]?.accountId;
  const an = data.analysis.find((a) => a.accountId === activeId) || data.analysis[0];
  const acct = data.accounts.find((a) => a.id === an.accountId);

  return (
    <>
      <PageTitle title="The Five Questions" sub="Answered for each account from cached MCP data. Click any evidence ID to see the source record. Moves, risks and unknowns are rule-based recommendations, not verified facts." />
      <div className="mb-4 flex flex-wrap gap-2">
        {data.analysis.map((a) => (
          <button key={a.accountId} onClick={() => setSp({ account: a.accountId })} className={`btn ${a.accountId === an.accountId ? 'bg-brand-600 text-white' : 'btn-ghost'}`}>
            {a.name} <SevBadge s={a.health} />
          </button>
        ))}
      </div>

      {an.reviewNote && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <BellRing size={16} className="mt-0.5" /><span className="flex-1"><b>Insights marked for review.</b> {an.reviewNote.reason}</span>
          <button className="underline" onClick={async () => { await api.clearReview(an.accountId); reload(); }}>Mark reviewed</button>
        </div>
      )}

      <Card title={`${an.name} — summary`} right={<Rec />} className="mb-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{an.summary.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <nav className="mt-3 flex flex-wrap gap-2 text-xs">{['q1', 'q2', 'q3', 'q4', 'q5'].map((q, i) => <a key={q} href={`#${q}`} className="rounded-full border border-white/10 px-2 py-1 text-slate-300 hover:bg-white/5">Q{i + 1}</a>)}</nav>
      </Card>

      <div className="space-y-4">
        <Q1 an={an} /><Q2 an={an} acct={acct} /><Q3 an={an} /><Q4 an={an} /><Q5 an={an} />
      </div>
    </>
  );
}

const QCard = ({ id, n, title, icon, children, right }) => (
  <div id={id} className="scroll-mt-28"><Card title={`Q${n}. ${title}`} icon={icon} right={right}>{children}</Card></div>
);

function Q1({ an }) {
  const t = an.q1.totals;
  return (
    <QCard id="q1" n={1} title="What is the book worth?" icon={Coins}>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label="Account total" value={money(t.all)} />
        <Mini label="Verified by documents" value={money(t.Verified)} tone="healthy" />
        <Mini label="Told / unverified" value={money((t.Told || 0) + (t.Unverified || 0))} tone="warning" />
        <Mini label="Deals without a value" value={t.unknownCount} />
      </div>
      {an.q1.deals.length === 0 ? <Empty title="No deals recorded">The account data contains no deals.</Empty> : (
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Deal</th><th className="th">Value</th><th className="th">Stage</th><th className="th">Status</th><th className="th">Source / basis</th><th className="th">Evidence IDs</th></tr></thead><tbody>
          {an.q1.deals.map((d) => (
            <tr key={d.key} className="border-t border-white/5">
              <td className="td font-medium text-slate-100">{d.title}</td>
              <td className="td">{money(d.value, d.currency)}</td>
              <td className="td"><Badge t="info">{d.stage}</Badge></td>
              <td className="td"><VerifBadge s={d.status} /></td>
              <td className="td text-xs text-slate-300">{d.basis}{d.support.filter((s) => s.snippet).map((s) => <div key={s.evidenceId} className="mt-1 italic text-slate-400">{s.snippet}</div>)}{d.conflict && <div className="mt-1 text-amber-300">Paperwork {d.conflict.evidenceId} mentions {d.conflict.amounts.join(', ')} — possible conflict.</div>}</td>
              <td className="td"><EvList ids={d.evidenceIds} /></td>
            </tr>))}
        </tbody></table></div>
      )}
      {an.q1.unsupported.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          <b>Shown separately — not presented as fact:</b> {an.q1.unsupported.map((d) => `${d.title} (${d.value == null ? 'no value' : money(d.value, d.currency)}, ${d.status})`).join('; ')}.
        </div>)}
    </QCard>
  );
}

function PersonLine({ p }) {
  return <li className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium text-slate-100">{p.name}</span>{p.title && <span className="text-slate-400">{p.title}</span>}{p.relationship && <Badge t={relTone[p.relationship]}>{p.relationship}</Badge>}{p.metStatus && <Badge t="warning">{p.metStatus}</Badge>}<EvList ids={[p.evidenceId]} /></li>;
}

function Q2({ an, acct }) {
  const q = an.q2;
  const groups = [['Who decides?', q.decisionMakers], ['Who pays?', q.budgetOwners], ['Who uses the product?', q.users], ['Champion', q.champions], ['Who could block it?', q.blockers], ['Influencers', q.influencers]];
  const roleOf = (p) => (q.edges.find((e) => e.name === p.name)?.role) || null;
  return (
    <QCard id="q2" n={2} title="Who holds the power?" icon={Crown}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          {groups.map(([label, list]) => (
            <div key={label}><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              {list.length ? <ul className="space-y-1">{list.map((p, i) => <PersonLine key={i} p={p} />)}</ul> : <p className="text-sm text-slate-500">Unknown — not established in the data.</p>}</div>))}
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Have we not met yet?</div>
            {q.notMet.length ? <ul className="space-y-1">{q.notMet.map((p, i) => <PersonLine key={i} p={p} />)}</ul> : <p className="text-sm text-slate-500">No unmet stakeholders are listed (this does not prove there are none).</p>}</div>
          <div><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Where does each person stand with us?</div>
            <div className="flex flex-wrap gap-2">{q.standing.map((s) => <Badge key={s.name} t={relTone[s.relationship]}>{s.name}: {s.relationship}</Badge>)}{!q.standing.length && <span className="text-sm text-slate-500">No people recorded.</span>}</div></div>
        </div>
        <StakeholderMap account={an.name} people={acct.people} roleOf={roleOf} />
      </div>
    </QCard>
  );
}

function Q3({ an }) {
  const { reload } = useStore();
  const [done, setDone] = useState({});
  const add = async (m, i) => {
    try { await api.addAction({ account: m.accountId, title: m.action, owner: m.owner, due: m.due, deal: m.deal, evidence: m.evidenceIds.join(', '), source: 'recommended' }); setDone((d) => ({ ...d, [i]: 'Added to Action Planner' })); reload(); }
    catch (e) { setDone((d) => ({ ...d, [i]: e.message })); }
  };
  return (
    <QCard id="q3" n={3} title="What do you do first?" icon={Flag} right={<Rec />}>
      {an.q3.length === 0 ? <Empty>No moves can be derived from the available data.</Empty> : (
        <ol className="space-y-3">
          {an.q3.map((m, i) => (
            <li key={i} className="rounded-lg border border-white/5 bg-navy-900 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{m.priority}</span><div className="font-medium text-slate-100">{m.action}</div></div>
                <button className="btn-ghost !py-1 text-xs" onClick={() => add(m, i)} disabled={Boolean(done[i])}>{done[i] || 'Add to planner'}</button>
              </div>
              <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                <Row k="Owner" v={m.owner} /><Row k="Due" v={`${m.due} — ${m.dueBasis}`} /><Row k="Account" v={m.accountName} /><Row k="Deal" v={m.deal} />
                <Row k="Expected outcome" v={m.expectedOutcome} /><Row k="Chance of success" v={m.chanceOfSuccess} /><Row k="Why this rank" v={m.reason} />
                <div className="flex items-center gap-2"><dt className="text-slate-400">Evidence</dt><dd><EvList ids={m.evidenceIds} /></dd></div>
              </dl>
            </li>))}
        </ol>)}
      <p className="mt-2 text-xs text-slate-500">Ranking = deal value + deadline urgency + blocker severity + renewal + stated win chance (only when the data gives one). Probabilities and customer deadlines are never invented; “proposed internal target” dates are our own planning dates.</p>
    </QCard>
  );
}
const Row = ({ k, v }) => <div className="flex gap-2"><dt className="shrink-0 text-slate-400">{k}</dt><dd className="text-slate-200">{v}</dd></div>;

function Q4({ an }) {
  const c = an.q4.counts;
  const groups = [['critical', 'Critical'], ['warning', 'Warning'], ['healthy', 'Healthy']];
  return (
    <QCard id="q4" n={4} title="What is about to go wrong?" icon={ShieldAlert} right={<div className="flex gap-1"><Badge t="critical">{c.critical} critical</Badge><Badge t="warning">{c.warning} warning</Badge><Badge t="healthy">{c.healthy} healthy</Badge></div>}>
      {an.q4.items.length === 0 ? <Empty title="No risk signals">Nothing in the data triggers a risk rule. That is not proof the account is healthy.</Empty> :
        groups.map(([sev, label]) => {
          const list = an.q4.items.filter((i) => i.severity === sev);
          if (!list.length) return null;
          return (
            <div key={sev} className="mb-3"><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
              <ul className="space-y-2">{list.map((r, i) => (
                <li key={i} className={`rounded-lg border-l-4 bg-navy-900 p-3 ${sev === 'critical' ? 'border-red-500' : sev === 'warning' ? 'border-amber-500' : 'border-emerald-500'}`}>
                  <div className="flex flex-wrap items-center gap-2"><SevBadge s={sev} />{sev !== 'healthy' && <Badge>{r.category}</Badge>}<span className="text-sm font-medium text-slate-100">{r.title}</span></div>
                  <p className="mt-1 text-xs text-slate-300"><b className="text-slate-400">Evidence: </b>{r.detail}</p>
                  <div className="mt-1"><EvList ids={r.evidenceIds} /></div>
                </li>))}</ul></div>);
        })}
    </QCard>
  );
}

function Q5({ an }) {
  return (
    <QCard id="q5" n={5} title="What do you still not know?" icon={HelpCircle} right={<Badge t="warning">{an.q5.length} open unknowns</Badge>}>
      {an.q5.length === 0 ? <Empty title="No gaps detected by the rules">The rules found no missing fields. Real gaps may still exist outside the data.</Empty> : (
        <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Unknown</th><th className="th">Why it matters</th><th className="th">Who can tell us</th><th className="th">Next question</th><th className="th">Related</th></tr></thead><tbody>
          {an.q5.map((u, i) => (
            <tr key={i} className="border-t border-white/5">
              <td className="td"><Badge t="warning">{u.category}</Badge><div className="mt-1 text-slate-200">{u.missing}</div></td>
              <td className="td text-xs text-slate-300">{u.why}</td><td className="td text-xs text-slate-300">{u.who}</td>
              <td className="td text-xs text-slate-100">“{u.question}”</td>
              <td className="td text-xs"><div className="text-slate-300">{an.name}{u.dealKey ? ' · deal' : ''}</div><EvList ids={u.evidenceIds} /></td>
            </tr>))}
        </tbody></table></div>)}
    </QCard>
  );
}

const Mini = ({ label, value, tone }) => (
  <div className="rounded-lg bg-navy-900 p-3"><div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div><div className={`text-lg font-semibold ${tone === 'healthy' ? 'text-emerald-300' : tone === 'warning' ? 'text-amber-300' : 'text-slate-50'}`}>{value}</div></div>
);
