import { useState } from 'react';
import { CalendarClock, Plus, Trash2, Info } from 'lucide-react';
import { Badge, Card, Empty, EvList, Gate, PageTitle, Rec } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';

export default function Planner() { return <Gate><Inner /></Gate>; }

const STATUS = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];

function Inner() {
  const { data, reload, now } = useStore();
  const [f, setF] = useState({ title: '', account: data.accounts[0]?.id || '', owner: '', due: '', deal: '' });
  const [err, setErr] = useState(null);
  const run = async (fn) => { try { setErr(null); await fn(); await reload(); } catch (e) { setErr(e.message); } };
  const tasks = data.localActions;
  const timeline = [...data.analysis.flatMap((a) => a.q3.map((m) => ({ date: m.due, title: m.action, account: a.name, kind: 'Recommended' }))), ...tasks.filter((t) => t.due).map((t) => ({ date: t.due, title: t.title, account: data.accounts.find((a) => a.id === t.account)?.name || '—', kind: 'Local task', done: t.status === 'done' }))].sort((x, y) => String(x.date).localeCompare(String(y.date)));
  const today = new Date(now).toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title="Action Planner" sub="Recommended first moves per account, plus your own internal tasks." />
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-white/10 bg-navy-800 p-3 text-xs text-slate-300"><Info size={14} className="mt-0.5 shrink-0 text-brand-400" />Local CRM tasks are planning aids stored in this app. They are <b>not</b> actions completed in the Questathon game. To record something in the game, write a note on the Notes page.</div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.analysis.map((a) => (
          <Card key={a.accountId} title={`${a.name} — top 3 next moves`} right={<Rec />}>
            {a.q3.length ? <ol className="space-y-2">{a.q3.map((m) => (
              <li key={m.priority} className="rounded-lg bg-navy-900 p-3 text-sm">
                <div className="flex items-start gap-2"><Badge t="info">#{m.priority}</Badge><span className="text-slate-100">{m.action}</span></div>
                <div className="mt-1 grid gap-x-3 text-xs text-slate-400 sm:grid-cols-2"><span>Owner: <b className="text-slate-300">{m.owner}</b></span><span>Due: <b className="text-slate-300">{m.due}</b></span><span>Deal: {m.deal}</span><span>Status: <Badge>Recommended — not started</Badge></span></div>
                <div className="mt-1"><EvList ids={m.evidenceIds} /></div>
              </li>))}</ol> : <Empty>No moves derived.</Empty>}
          </Card>))}
      </div>

      <Card title="Timeline" icon={CalendarClock} className="mt-4">
        {timeline.length ? <ol className="relative ml-2 space-y-3 border-l border-white/10 pl-4">{timeline.map((t, i) => (
          <li key={i} className="relative text-sm"><i className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${t.date < today ? 'bg-red-500' : t.kind === 'Recommended' ? 'bg-brand-500' : 'bg-emerald-500'}`} />
            <span className="font-mono text-xs text-slate-400">{t.date}</span> <Badge t={t.kind === 'Recommended' ? 'info' : 'healthy'}>{t.kind}</Badge> <span className={t.done ? 'text-slate-500 line-through' : 'text-slate-200'}>{t.title}</span> <span className="text-xs text-slate-500">· {t.account}</span></li>))}</ol> : <p className="text-sm text-slate-400">No dated items yet.</p>}
      </Card>

      <Card title="Local action checklist" className="mt-4">
        <form className="mb-4 grid gap-2 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) return; run(async () => { await api.addAction({ ...f, source: 'manual' }); setF({ ...f, title: '', deal: '' }); }); }}>
          <input className="input md:col-span-2" placeholder="New task title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <select className="input" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })}>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input className="input" placeholder="Owner" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} />
          <input className="input" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
          <button className="btn-primary" type="submit"><Plus size={14} />Add</button>
        </form>
        {err && <p className="mb-2 text-xs text-red-300">{err}</p>}
        {tasks.length === 0 ? <Empty title="No local tasks">Add a task above or use “Add to planner” on a recommended move.</Empty> : (
          <ul className="divide-y divide-white/5">{tasks.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <input type="checkbox" checked={t.status === 'done'} onChange={(e) => run(() => api.updateAction(t.id, { status: e.target.checked ? 'done' : 'todo' }))} className="h-4 w-4 accent-blue-500" aria-label="Done" />
              <input className={`input !w-auto min-w-[220px] flex-1 ${t.status === 'done' ? 'text-slate-500 line-through' : ''}`} defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && run(() => api.updateAction(t.id, { title: e.target.value }))} />
              <input className="input !w-32" defaultValue={t.owner || ''} placeholder="Owner" onBlur={(e) => e.target.value !== (t.owner || '') && run(() => api.updateAction(t.id, { owner: e.target.value }))} />
              <input className="input !w-36" type="date" defaultValue={t.due || ''} onBlur={(e) => e.target.value !== (t.due || '') && run(() => api.updateAction(t.id, { due: e.target.value }))} />
              <select className="input !w-32" value={t.status} onChange={(e) => run(() => api.updateAction(t.id, { status: e.target.value }))}>{STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <Badge>{data.accounts.find((a) => a.id === t.account)?.name || '—'}</Badge>{t.source === 'recommended' && <Badge t="info">from recommendation</Badge>}
              {t.evidence && <EvList ids={t.evidence.split(/,\s*/)} />}
              <button className="btn-ghost !p-1.5" onClick={() => run(() => api.deleteAction(t.id))} aria-label="Delete task"><Trash2 size={14} /></button>
            </li>))}</ul>)}
      </Card>
    </>
  );
}
