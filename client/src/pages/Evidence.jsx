import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Card, Empty, EvChip, Gate, PageTitle, VerifBadge, acctName } from '../components/ui.jsx';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { dt } from '../lib/format.js';

export default function Evidence() { return <Gate><Inner /></Gate>; }

function Inner() {
  const { data, status } = useStore();
  const [q, setQ] = useState(''); const [acct, setAcct] = useState('all'); const [st, setSt] = useState('all'); const [type, setType] = useState('all');
  const types = useMemo(() => [...new Set(data.evidence.map((e) => e.type.split(' · ')[0]))], [data]);
  const rows = data.evidence.filter((e) => (acct === 'all' || e.accountId === acct) && (st === 'all' || e.status === st) && (type === 'all' || e.type.startsWith(type)) && (!q || `${e.id} ${e.description}`.toLowerCase().includes(q.toLowerCase())));
  const counts = ['Verified', 'Told', 'Unverified', 'Unknown'].map((s) => [s, data.evidence.filter((e) => e.status === s).length]);
  return (
    <>
      <PageTitle title="Evidence Explorer" sub="Every record retrieved from get_my_accounts, get_all_paperwork, get_data_format and get_signals, with the status that determines how far a number can be trusted." />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-xs">
        <Def s="Verified" t="Supported by a paperwork record (cited, or the same amount appears in the document)." />
        <Def s="Told" t="A person or signal said it; no document backs it yet." />
        <Def s="Unverified" t="Appears only on the account sheet." />
        <Def s="Unknown" t="Not established in the data." />
      </div>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1"><Search size={14} className="absolute left-3 top-3 text-slate-500" /><input className="input !pl-8" placeholder="Search evidence ID or text" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Sel value={acct} onChange={setAcct} options={[['all', 'All accounts'], ...data.accounts.map((a) => [a.id, a.name])]} />
          <Sel value={type} onChange={setType} options={[['all', 'All types'], ...types.map((t) => [t, t])]} />
          <Sel value={st} onChange={setSt} options={[['all', 'All statuses'], ...counts.map(([s, n]) => [s, `${s} (${n})`])]} />
        </div>
      </Card>
      {rows.length === 0 ? <Empty title="No evidence matches">Adjust the filters.</Empty> : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr><th className="th">Evidence ID</th><th className="th">Type</th><th className="th">Account</th><th className="th">Description</th><th className="th">Source</th><th className="th">Status</th></tr></thead><tbody>
          {rows.map((e) => <tr key={e.id} className="border-t border-white/5"><td className="td"><EvChip id={e.id} /></td><td className="td text-xs">{e.type}</td><td className="td text-xs">{e.accountId ? acctName(data, e.accountId) : '—'}</td><td className="td text-xs text-slate-300">{e.description.slice(0, 240)}</td><td className="td text-xs text-slate-400">{e.source}<div>{e.date || ''}</div></td><td className="td"><VerifBadge s={e.status} /></td></tr>)}
        </tbody></table></div>)}
      <RawViewer status={status} />
    </>
  );
}

const Def = ({ s, t }) => <div className="card p-3"><VerifBadge s={s} /><p className="mt-1 text-slate-400">{t}</p></div>;
const Sel = ({ value, onChange, options }) => <select className="input !w-auto" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;

function RawViewer({ status }) {
  const [tool, setTool] = useState(null); const [raw, setRaw] = useState(null); const [err, setErr] = useState(null);
  const open = async (t) => { setTool(t); setRaw(null); setErr(null); try { setRaw(await api.raw(t)); } catch (e) { setErr(e.message); } };
  return (
    <Card title="Stored raw MCP responses" className="mt-4">
      <p className="mb-2 text-xs text-slate-400">The unmodified payloads the dashboard is built from (the token is never stored).</p>
      <div className="flex flex-wrap gap-2">{['get_my_accounts', 'get_all_paperwork', 'get_data_format', 'get_signals'].map((t) => <button key={t} className={`btn ${tool === t ? 'bg-brand-600 text-white' : 'btn-ghost'} text-xs`} onClick={() => open(t)}>{t}{status?.fetchedAt?.[t] ? <Badge t="healthy">{dt(status.fetchedAt[t])}</Badge> : <Badge>not fetched</Badge>}</button>)}</div>
      {err && <p className="mt-2 text-xs text-amber-300">{err}</p>}
      {raw && <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-navy-950 p-3 text-xs text-slate-300">{JSON.stringify(raw.payload, null, 2)}</pre>}
    </Card>
  );
}
