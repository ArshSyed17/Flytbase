// TEST FIXTURE ONLY. A fake MCP server used to verify the CRM end-to-end without spending the
// real token's one-call-per-minute budget. None of this data is shipped in or seeded into the app.
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 9099);
const TOKEN = process.env.MOCK_TOKEN || 'test-token';
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const accounts = { accounts: [
  { id: 'T-001', name: 'Test Co Alpha', overview: 'Fixture account A', deals: [
      { id: 'd1', title: 'Fixture Renewal', type: 'renewal', value: 120000, stage: 'Qualified', deadline: day(5), blocker: 'Security review pending', decision_maker: 'Dana Test', budget_owner: 'Finn Test', source: 'Quote Q-1' },
      { id: 'd2', title: 'Fixture Expansion', value: '$45,000', stage: 'Identified', deadline: day(40), required_evidence: 'Pilot results' } ],
    people: [ { name: 'Dana Test', title: 'VP Ops', relationship: 'Guarded', cares_about: 'Uptime', waiting_for: 'Security answers', role: 'decision maker' },
              { name: 'Finn Test', title: 'CFO', relationship: 'Neutral', met: false },
              { name: 'Uma Test', title: 'Operator', relationship: 'Ally', role: 'champion' } ] },
  { id: 'T-002', name: 'Test Co Beta', overview: 'Fixture account B', deals: [
      { id: 'd3', title: 'Fixture Pilot', value: 30000, stage: 'Agreed', deadline: day(-3) } ],
    people: [ { name: 'Bo Test', title: 'CTO', relationship: 'Warm' } ] } ] };

const paperwork = { paperwork: [
  { id: 'P-1', title: 'Quote Q-1', account: 'T-001', type: 'quote', content: 'Fixture Renewal annual price is $120,000 pending security review.' },
  { id: 'P-2', title: 'Pilot note', account: 'T-002', type: 'email', content: 'Pilot for Test Co Beta agreed at $30,000.' } ] };

const format = { schema: { write_note: { kind: { enum: ['note', 'task', 'risk', 'next_step'] } } } };
let signalCalls = 0;
const signals = () => ({ signals: [ { id: 'S-1', type: 'meeting', account: 'T-001', description: 'Dana asked for the security report', timestamp: new Date().toISOString() },
  ...(signalCalls > 1 ? [{ id: 'S-2', type: 'email', account: 'T-001', description: 'Renewal review delayed by a week', deal: 'Fixture Renewal' }] : []) ] });

const handlers = { get_my_accounts: () => accounts, get_all_paperwork: () => paperwork, get_data_format: () => format, get_signals: () => { signalCalls++; return signals(); },
  write_note: (a) => ({ ok: true, saved: a }) };

http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end('unauthorized'); }
    const msg = JSON.parse(body || '{}');
    const h = handlers[msg.params?.name];
    const result = h ? { content: [{ type: 'text', text: JSON.stringify(h(msg.params.arguments)) }] } : null;
    const envelope = result ? { jsonrpc: '2.0', id: msg.id, result } : { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'unknown tool' } };
    // alternate JSON and SSE so both parsers are exercised
    if (msg.params?.name === 'get_all_paperwork' || msg.params?.name === 'write_note') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end(`event: message\ndata: ${JSON.stringify(envelope)}\n\n`);
    } else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(envelope)); }
  });
}).listen(PORT, () => console.log('mock MCP on', PORT));
