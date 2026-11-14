import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.AQ_TOKEN = 'super-secret-token-123';
process.env.MCP_MIN_GAP_MS = '1'; // must be ignored for the official endpoint

const mcp = await import('../src/mcp.js');
const { normalizeAccounts, toNumber, mapStage } = await import('../src/normalize.js');

test('official endpoint enforces at least a 60s gap', () => {
  assert.equal(mcp.MIN_GAP_MS, 60000);
});

test('parses text/event-stream responses', () => {
  const env = { jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: '{"a":1}' }] } };
  const msg = mcp.parseMcpBody('text/event-stream', `event: message\ndata: ${JSON.stringify(env)}\n\n`, 3);
  assert.deepEqual(mcp.unwrapResult(msg), { a: 1 });
});

test('parses plain JSON and surfaces tool errors', () => {
  const ok = mcp.parseMcpBody('application/json', JSON.stringify({ id: 1, result: { structuredContent: { x: 2 } } }), 1);
  assert.deepEqual(mcp.unwrapResult(ok), { x: 2 });
  assert.throws(() => mcp.unwrapResult({ result: { isError: true, content: [{ type: 'text', text: 'nope' }] } }), /nope/);
});

test('token never survives scrub()', () => {
  const s = mcp.scrub('failed with Authorization: Bearer super-secret-token-123 and super-secret-token-123');
  assert.ok(!s.includes('super-secret-token-123'));
});

test('normalizer never invents values', () => {
  const [a] = normalizeAccounts({ accounts: [{ id: 'X', name: 'X Co', deals: [{ title: 'D' }] }] });
  assert.equal(a.deals[0].value, null);
  assert.equal(a.deals[0].stage, null);
  assert.equal(a.people.length, 0);
  assert.equal(toNumber('$45k'), 45000);
  assert.equal(mapStage('Blocker cleared'), 'Blocker Cleared');
});
