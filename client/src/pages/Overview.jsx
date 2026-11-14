import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import { Badge, Card, Empty, EvChip, Gate, PageTitle, Stat, SevBadge } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { COLORS, dt, money, moneyCompact, stageColor } from '../lib/format.js';

const tip = { contentStyle: { background: '#0b1426', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 12 }, labelStyle: { color: '#cbd5e1' } };

export default function Overview() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { data, status } = useStore();
  const o = data.overview;
  const stageData = Object.entries(o.stageCounts).filter(([k, v]) => v > 0 || k !== 'Unknown').map(([name, value]) => ({ name, value }));
  const healthData = ['Critical', 'Warning', 'Healthy', 'Unknown'].map((h) => ({ name: h, value: o.healthByAccount.filter((x) => x.health === h).length })).filter((x) => x.value);
  const healthColor = { Critical: COLORS.critical, Warning: COLORS.warning, Healthy: COLORS.healthy, Unknown: COLORS.slate };
  const valueData = o.valueByAccount.map((v) => ({ name: v.name, Verified: v.verified, Other: Math.max(0, v.total - v.verified) }));
  const renewal = o.renewalRisks.reduce((m, r) => { m[r.severity] = (m[r.severity] || 0) + 1; return m; }, {});
  const renewalData = [['critical', 'Critical'], ['warning', 'Warning']].map(([k, n]) => ({ name: n, value: renewal[k] || 0, k }));
  const c = o.criteria;

  return (
    <>
      <PageTitle title="Executive Overview" sub="Every figure is calculated from the cached MCP responses. Unknown means the data does not say." />

      <Card title="Questathon judging criteria — live status" className="mb-5">
        <div className="grid gap-3 md:grid-cols-5">
          <Crit to="/questions" ok={c.fiveQuestions} title="1. Five questions" text={`Answered for ${o.totalAccounts} account(s)`} />
          <Crit to="/evidence" ok={c.tracedNumbers && c.tracedNumbers.traced === c.tracedNumbers.total} partial={c.tracedNumbers && c.tracedNumbers.traced > 0} title="2. Traceable numbers" text={c.tracedNumbers ? `${c.tracedNumbers.traced}/${c.tracedNumbers.total} deal values backed by a document` : 'No deal values yet'} />
          <Crit to="/planner" ok={c.moves.length > 0 && c.moves.every((m) => m.count >= 3)} title="3. Owned, dated first moves" text={c.moves.map((m) => `${m.count}`).join(' + ') + ' moves (3 per account)'} />
          <Crit to="/questions" ok={c.unknowns.some((u) => u.count > 0)} title="4. Honest unknowns" text={`${c.unknowns.reduce((s, u) => s + u.count, 0)} unknowns documented`} />
          <Crit to="/events" ok={c.signals > 0} title="5. Live updates + write-back" text={`${c.signals} signals · ${data.notes.filter((n) => n.status === 'confirmed').length} notes confirmed by MCP`} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
        <Stat label="Customer accounts" value={o.totalAccounts} />
        <Stat label="Verified deal value" value={money(o.verifiedValue)} sub={`Told ${money(o.toldValue)} · Unverified ${money(o.unverifiedValue)}`} tone="healthy" />
        <Stat label="Identified deals" value={o.stageCounts.Identified} />
        <Stat label="Qualified deals" value={o.stageCounts.Qualified} />
        <Stat label="Blocked deals" value={o.blockedDeals} tone={o.blockedDeals ? 'warning' : undefined} />
        <Stat label="Agreed deals" value={o.stageCounts.Agreed} tone="healthy" />
        <Stat label="Blocker Cleared" value={o.stageCounts['Blocker Cleared']} />
        <Stat label="Critical risks" value={o.criticalRisks} sub={`${o.warningRisks} warnings`} tone={o.criticalRisks ? 'critical' : undefined} />
        <Stat label="Deadlines ≤30 days" value={o.upcomingDeadlines.length} tone={o.upcomingDeadlines.length ? 'warning' : undefined} />
        <Stat label="Latest MCP sync" value={<span className="text-base">{dt(status?.queue.lastSuccessAt)}</span>} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card title="Deal stage distribution">
          <div className="h-60"><ResponsiveContainer><BarChart data={stageData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} /><YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} /><Tooltip {...tip} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
            <Bar dataKey="value" name="Deals" radius={[4, 4, 0, 0]}>{stageData.map((d) => <Cell key={d.name} fill={stageColor[d.name]} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Account health overview">
          {healthData.length ? <div className="h-60"><ResponsiveContainer><PieChart><Pie data={healthData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{healthData.map((d) => <Cell key={d.name} fill={healthColor[d.name]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 12 }} /></PieChart></ResponsiveContainer></div> : <Empty>No account health yet.</Empty>}
          <div className="mt-1 flex flex-wrap gap-2 text-xs">{o.healthByAccount.map((h) => <Link key={h.accountId} to={`/accounts/${encodeURIComponent(h.accountId)}`} className="hover:underline">{h.name}: <SevBadge s={h.health} /></Link>)}</div>
        </Card>
        <Card title="Renewal risk overview">
          {o.renewalRisks.length ? <>
            <div className="h-40"><ResponsiveContainer><BarChart data={renewalData} layout="vertical"><XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} /><YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={60} /><Tooltip {...tip} /><Bar dataKey="value" name="Risks" radius={[0, 4, 4, 0]}>{renewalData.map((d) => <Cell key={d.k} fill={COLORS[d.k]} />)}</Bar></BarChart></ResponsiveContainer></div>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">{o.renewalRisks.slice(0, 4).map((r, i) => <li key={i}><SevBadge s={r.severity} /> {r.accountName}: {r.title} <EvChip id={r.evidenceIds[0]} /></li>)}</ul></>
            : <Empty title="No renewal risks flagged">Renewal risk is only flagged when the data marks a deal as a renewal or records a risk. Nothing is assumed.</Empty>}
        </Card>
        <Card title="Deal value distribution by account">
          {valueData.some((v) => v.Verified || v.Other) ? <div className="h-60"><ResponsiveContainer><BarChart data={valueData}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="name" stroke="#94a3b8" fontSize={11} /><YAxis tickFormatter={moneyCompact} stroke="#94a3b8" fontSize={11} /><Tooltip {...tip} formatter={(v) => money(v)} cursor={{ fill: 'rgba(255,255,255,.04)' }} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Verified" stackId="a" fill={COLORS.healthy} /><Bar dataKey="Other" name="Told / unverified" stackId="a" fill={COLORS.warning} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty>No deal values in the data.</Empty>}
        </Card>
      </div>

      <Card title="Upcoming deadlines (next 30 days)" icon={Clock} className="mt-5">
        {o.upcomingDeadlines.length ? (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Deal</th><th className="th">Account</th><th className="th">Deadline</th><th className="th">In</th><th className="th">Source</th></tr></thead><tbody>
            {o.upcomingDeadlines.map((d, i) => <tr key={i} className="border-t border-white/5"><td className="td">{d.deal}</td><td className="td">{data.accounts.find((a) => a.id === d.account)?.name}</td><td className="td">{d.deadline}</td><td className="td"><Badge t={d.inDays <= 7 ? 'critical' : 'warning'}>{d.inDays}d</Badge></td><td className="td"><EvChip id={d.evidenceId} /></td></tr>)}
          </tbody></table></div>
        ) : <p className="text-sm text-slate-400">No dated deadlines within 30 days in the cached data.</p>}
      </Card>
    </>
  );
}

function Crit({ to, ok, partial, title, text }) {
  const Icon = ok ? CheckCircle2 : CircleDashed;
  return (
    <Link to={to} className="rounded-lg border border-white/5 bg-navy-900 p-3 transition hover:border-brand-500/40">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-100"><Icon size={16} className={ok ? 'text-emerald-400' : partial ? 'text-amber-400' : 'text-slate-500'} />{title}</div>
      <div className="mt-1 text-xs text-slate-400">{text}</div>
    </Link>
  );
}
