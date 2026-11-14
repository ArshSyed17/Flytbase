import { useState } from 'react';
import { Send } from 'lucide-react';
import { Badge, Card, Empty, Gate, PageTitle, acctName } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { dt, mmss } from '../lib/format.js';

export default function Notes() { return <Gate><Inner /></Gate>; }

const DEFAULT_KINDS = [['note', 'General note'], ['task', 'Task'], ['risk', 'Risk'], ['next_step', 'Next step']];
const statusTone = { confirmed: 'healthy', failed: 'critical', queued: 'warning', sending: 'info' };
const statusText = { confirmed: 'Confirmed by MCP', failed: 'Failed — not saved', queued: 'Queued (waiting for 60s limit)', sending: 'Sending to MCP…' };

function Inner() {
  const { data, status, cooldownMs, reload, reloadStatus } = useStore();
  const kinds = data.noteKinds?.length ? data.noteKinds.map((k) => [k, k]) : DEFAULT_KINDS;
  const [f, setF] = useState({ account: data.accounts[0]?.id, kind: kinds[0][0], title: '', text: '' });
  const [msg, setMsg] = useState(null); const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setSending(true);
    try { await api.writeNote(f); setF({ ...f, title: '', text: '' }); setMsg({ ok: true, t: 'Queued. It is only recorded as saved once the MCP server confirms it.' }); await reload(); await reloadStatus(); }
    catch (er) { setMsg({ ok: false, t: er.message }); } finally { setSending(false); }
  };
  return (
    <>
      <PageTitle title="Notes → Game" sub="Writes to the Questathon game through write_note. A note counts as saved only when the MCP server confirms it." />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="New note" className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-slate-400">Account<select className="input mt-1" value={f.account} onChange={(e) => setF({ ...f, account: e.target.value })}>{data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}</select></label>
            <label className="block text-xs text-slate-400">Note type<select className="input mt-1" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{kinds.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block text-xs text-slate-400">Title<input className="input mt-1" required maxLength={140} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label className="block text-xs text-slate-400">Description<textarea className="input mt-1 min-h-[120px]" required value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></label>
            <button className="btn-primary w-full" disabled={sending || !status?.tokenConfigured}><Send size={14} />Send to game{cooldownMs > 0 ? ` (queue starts in ${mmss(cooldownMs)})` : ''}</button>
            {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{msg.t}</p>}
            <p className="text-[11px] text-slate-500">Each write uses the same 1-call-per-minute MCP budget as reads, so it may wait in the queue.</p>
          </form>
        </Card>
        <Card title="Submission log" className="lg:col-span-3">
          {data.notes.length === 0 ? <Empty title="No notes submitted">Notes you send appear here with the MCP server’s response.</Empty> : (
            <ul className="space-y-3">{data.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-navy-900 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><Badge t={statusTone[n.status]}>{statusText[n.status] || n.status}</Badge><Badge>{n.kind}</Badge><span className="text-xs text-slate-400">{acctName(data, n.account)} · {dt(n.created_at)}</span></div>
                <div className="mt-1 font-medium text-slate-100">{n.title}</div><p className="whitespace-pre-wrap text-xs text-slate-300">{n.text}</p>
                {(n.response || n.error) && <pre className={`mt-2 max-h-40 overflow-auto rounded bg-navy-950 p-2 text-[11px] ${n.error ? 'text-red-300' : 'text-slate-300'}`}>{n.error ? `Error: ${n.error}\n` : ''}{n.response ? `MCP response: ${n.response}` : ''}</pre>}
              </li>))}</ul>)}
        </Card>
      </div>
    </>
  );
}
