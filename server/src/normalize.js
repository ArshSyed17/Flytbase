// Defensive normalization of MCP payloads. The exact schema is discovered at runtime
// (get_data_format), so every field is read through alias lists and nothing is invented:
// anything not found stays null and is rendered as "Unknown" by the UI.

export const STAGES = ['Identified', 'Qualified', 'Blocker Cleared', 'Agreed'];
export const RELATIONSHIPS = ['Guarded', 'Neutral', 'Warm', 'Ally'];

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const str = (v) => (v == null ? null : typeof v === 'string' ? (v.trim() || null) : typeof v === 'number' || typeof v === 'boolean' ? String(v) : null);

export function pick(o, keys) {
  if (!isObj(o)) return undefined;
  const lower = Object.fromEntries(Object.keys(o).map((k) => [k.toLowerCase().replace(/[\s-]/g, '_'), k]));
  for (const k of keys) {
    const real = lower[k];
    if (real !== undefined && o[real] !== null && o[real] !== undefined && o[real] !== '') return o[real];
  }
  return undefined;
}
const pickStr = (o, keys) => str(pick(o, keys));

export function toNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?\s*(k|m|million|thousand|lakh|l|cr|crore)?\b/i);
  if (!m) return null;
  let n = parseFloat(m[0]);
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') n *= 1e3;
  else if (unit === 'm' || unit === 'million') n *= 1e6;
  else if (unit === 'lakh' || unit === 'l') n *= 1e5;
  else if (unit === 'cr' || unit === 'crore') n *= 1e7;
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v) {
  if (v == null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Find the most plausible array of records inside an arbitrary payload. */
export function findRecords(payload, keyHints = []) {
  if (Array.isArray(payload)) return payload.flatMap((p) => (isObj(p) && Array.isArray(pick(p, keyHints)) && !pick(p, ['id', 'name']) ? pick(p, keyHints) : [p]));
  if (!isObj(payload)) return [];
  for (const k of keyHints) {
    const v = pick(payload, [k]);
    if (Array.isArray(v)) return v;
    if (isObj(v)) { const inner = Object.entries(v); if (inner.length && inner.every(([, x]) => isObj(x))) return inner.map(([id, x]) => ({ id, ...x })); }
  }
  for (const v of Object.values(payload)) if (Array.isArray(v) && v.some(isObj)) return v;
  for (const v of Object.values(payload)) if (isObj(v)) { const r = findRecords(v, keyHints); if (r.length) return r; }
  return isObj(payload) && pick(payload, ['id', 'name']) ? [payload] : [];
}

export function mapStage(v) {
  const s = (str(v) || '').toLowerCase();
  if (!s) return null;
  if (s.includes('agree') || s.includes('won') || s.includes('closed')) return 'Agreed';
  if (s.includes('clear') || s.includes('unblock')) return 'Blocker Cleared';
  if (s.includes('qualif')) return 'Qualified';
  if (s.includes('identif') || s.includes('new') || s.includes('lead')) return 'Identified';
  return null;
}

export function mapRelationship(v) {
  const s = (str(v) || '').toLowerCase();
  if (!s) return null;
  if (s.includes('ally') || s.includes('champion') || s.includes('advocate')) return 'Ally';
  if (s.includes('warm') || s.includes('friendly') || s.includes('positive')) return 'Warm';
  if (s.includes('guard') || s.includes('cold') || s.includes('hostile') || s.includes('resist') || s.includes('disengag')) return 'Guarded';
  if (s.includes('neutral')) return 'Neutral';
  return null;
}

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ROLE_KEYS = {
  decision_maker: /decision|decider|approver|sponsor/i,
  economic_buyer: /econom|budget|payer|buyer|finance/i,
  user: /user|operator|pilot/i,
  champion: /champion/i,
  blocker: /block|opponent|skeptic|resist/i,
  influencer: /influenc|advis/i,
};
export function mapRole(v) {
  const s = str(v);
  if (!s) return null;
  for (const [role, re] of Object.entries(ROLE_KEYS)) if (re.test(s)) return role;
  return null;
}

function normalizePerson(p, accountId, idx, path) {
  if (typeof p === 'string') p = { name: p };
  if (!isObj(p)) return null;
  const name = pickStr(p, ['name', 'full_name', 'person', 'contact']);
  if (!name) return null;
  const roleText = pickStr(p, ['role', 'role_type', 'stakeholder_role', 'persona', 'influence_role']);
  const met = pick(p, ['met', 'has_met', 'is_met', 'met_yet']);
  const status = pickStr(p, ['status']);
  return {
    id: pickStr(p, ['id', 'person_id', 'contact_id']) || null,
    key: `${accountId}:${slug(name)}`,
    accountId, name,
    title: pickStr(p, ['title', 'job_title', 'position', 'designation']),
    role: mapRole(roleText), roleText,
    relationship: mapRelationship(pick(p, ['relationship', 'relationship_status', 'warmth', 'stance', 'sentiment']) ?? status),
    relationshipRaw: pickStr(p, ['relationship', 'relationship_status', 'warmth', 'stance', 'sentiment']) || status,
    caresAbout: pickStr(p, ['cares_about', 'priorities', 'motivation', 'interests', 'goals']) || (Array.isArray(pick(p, ['cares_about', 'priorities'])) ? pick(p, ['cares_about', 'priorities']).join('; ') : null),
    influence: pickStr(p, ['influence', 'influence_on_deal', 'power', 'authority']),
    waitingFor: pickStr(p, ['waiting_for', 'awaiting', 'needs_from_us', 'pending', 'expects']),
    met: met === undefined ? null : (typeof met === 'string' ? !/^(no|false|not)/i.test(met) : Boolean(met)),
    quote: pickStr(p, ['said', 'statement', 'quote', 'told']),
    sourceRef: pickStr(p, ['source', 'source_id', 'evidence', 'evidence_id', 'doc_id']),
    locator: `${path}[${idx}]`,
    raw: p,
  };
}

function normalizeDeal(d, accountId, idx, path) {
  if (!isObj(d)) return null;
  const title = pickStr(d, ['title', 'name', 'deal', 'opportunity', 'deal_name']);
  if (!title) return null;
  const valueRaw = pick(d, ['value', 'amount', 'deal_value', 'arr', 'acv', 'size']);
  const stageRaw = pickStr(d, ['stage', 'status', 'deal_stage']);
  const blocker = pickStr(d, ['blocker', 'blocked_by', 'blocking_issue', 'obstacle']);
  const blockedFlag = pick(d, ['blocked', 'is_blocked']);
  return {
    id: pickStr(d, ['id', 'deal_id', 'opportunity_id']) || null,
    key: `${accountId}:${slug(pickStr(d, ['id', 'deal_id']) || title)}`,
    accountId, title,
    type: pickStr(d, ['type', 'kind', 'category']),
    value: toNumber(valueRaw), valueRaw: valueRaw === undefined ? null : valueRaw,
    currency: pickStr(d, ['currency']) || (typeof valueRaw === 'string' ? (valueRaw.match(/[$€£₹]|USD|EUR|GBP|INR/i) || [null])[0] : null),
    stage: mapStage(stageRaw), stageRaw,
    deadline: pickStr(d, ['deadline', 'due', 'due_date', 'close_date', 'decision_date', 'renewal_date']),
    blocker, blocked: blockedFlag !== undefined ? Boolean(blockedFlag) : Boolean(blocker),
    requiredEvidence: pickStr(d, ['required_evidence', 'evidence_required', 'needs', 'requirements', 'proof_needed']),
    decisionMaker: pickStr(d, ['decision_maker', 'decider', 'approver']),
    budgetOwner: pickStr(d, ['budget_owner', 'economic_buyer', 'payer']),
    nextAction: pickStr(d, ['next_action', 'next_step', 'next']),
    owner: pickStr(d, ['owner', 'assigned_to']),
    probability: toNumber(pick(d, ['probability', 'win_probability', 'chance'])),
    sourceRef: pickStr(d, ['source', 'source_id', 'evidence', 'evidence_id', 'doc_id', 'told_by']),
    verifiedFlag: pick(d, ['verified', 'is_verified']),
    locator: `${path}[${idx}]`,
    raw: d,
  };
}

export function normalizeAccounts(payload) {
  const records = findRecords(payload, ['accounts', 'my_accounts', 'customers', 'data', 'items']);
  return records.filter(isObj).map((a, i) => {
    const id = pickStr(a, ['id', 'account_id', 'accountid', 'slug', 'key']);
    const name = pickStr(a, ['name', 'account_name', 'company', 'customer', 'title']) || id;
    const aid = id || slug(name) || `account-${i}`;
    const base = `accounts[${i}]`;
    const dealsRaw = pick(a, ['deals', 'opportunities', 'pipeline']);
    const peopleRaw = pick(a, ['people', 'stakeholders', 'contacts', 'people_met', 'persons']);
    const unmetRaw = pick(a, ['people_not_met', 'unmet', 'not_met', 'unmet_stakeholders', 'unknown_stakeholders']);
    const deals = arr(dealsRaw).map((d, j) => normalizeDeal(d, aid, j, `${base}.deals`)).filter(Boolean);
    const people = arr(peopleRaw).map((p, j) => normalizePerson(p, aid, j, `${base}.people`)).filter(Boolean);
    const unmet = arr(unmetRaw).map((p, j) => normalizePerson(p, aid, j, `${base}.people_not_met`)).filter(Boolean).map((p) => ({ ...p, met: false }));
    const riskRaw = pick(a, ['risks', 'risk', 'renewal_risk', 'risk_flags']);
    return {
      id: aid, idFromData: Boolean(id), name,
      overview: pickStr(a, ['overview', 'summary', 'description', 'about', 'background', 'notes']),
      industry: pickStr(a, ['industry', 'sector']),
      relationship: mapRelationship(pick(a, ['relationship', 'relationship_status', 'health'])),
      relationshipRaw: pickStr(a, ['relationship', 'relationship_status', 'health']),
      renewalDate: pickStr(a, ['renewal_date', 'renewal', 'contract_end', 'term_end']),
      healthRaw: pickStr(a, ['health', 'health_status', 'status']),
      risks: arr(riskRaw).map((r) => (isObj(r) ? JSON.stringify(r) : str(r))).filter(Boolean),
      deadlines: arr(pick(a, ['deadlines', 'upcoming_deadlines', 'commitments'])).map((r) => (isObj(r) ? (pickStr(r, ['title', 'name', 'description']) ? `${pickStr(r, ['title', 'name', 'description'])}${pickStr(r, ['date', 'due', 'deadline']) ? ' — ' + pickStr(r, ['date', 'due', 'deadline']) : ''}` : JSON.stringify(r)) : str(r))).filter(Boolean),
      deals, people: [...people, ...unmet],
      locator: base, raw: a,
    };
  });
}

export function normalizePaperwork(payload, accounts) {
  let records = [];
  if (isObj(payload) && !Array.isArray(payload)) {
    const direct = findRecords(payload, ['paperwork', 'documents', 'docs', 'files', 'records', 'items', 'data']);
    records = direct;
  } else records = findRecords(payload, ['paperwork', 'documents']);
  const accById = Object.fromEntries(accounts.map((a) => [a.id.toLowerCase(), a]));
  const accByName = Object.fromEntries(accounts.map((a) => [a.name.toLowerCase(), a]));
  return records.map((d, i) => {
    if (typeof d === 'string') d = { content: d };
    if (!isObj(d)) return null;
    const content = pickStr(d, ['content', 'text', 'body', 'markdown', 'summary']) || (pick(d, ['content', 'text', 'body']) ? JSON.stringify(pick(d, ['content', 'text', 'body'])) : null);
    const acctRef = pickStr(d, ['account', 'account_id', 'accountid', 'customer', 'account_name']);
    const acct = acctRef ? (accById[acctRef.toLowerCase()] || accByName[acctRef.toLowerCase()]) : null;
    return {
      id: pickStr(d, ['id', 'doc_id', 'document_id', 'file_id', 'filename', 'file_name', 'name']) || null,
      locator: `paperwork[${i}]`,
      title: pickStr(d, ['title', 'name', 'filename', 'file_name', 'subject']) || `Paperwork record ${i + 1}`,
      type: pickStr(d, ['type', 'kind', 'doc_type', 'category', 'format']),
      accountId: acct ? acct.id : (acctRef || null),
      date: pickStr(d, ['date', 'created_at', 'timestamp', 'sent_at']),
      author: pickStr(d, ['author', 'from', 'owner', 'source']),
      content, raw: d,
    };
  }).filter(Boolean);
}

export function normalizeSignals(payload, accounts) {
  const records = findRecords(payload, ['signals', 'events', 'items', 'data', 'updates']);
  const accById = Object.fromEntries(accounts.map((a) => [a.id.toLowerCase(), a]));
  const accByName = Object.fromEntries(accounts.map((a) => [a.name.toLowerCase(), a]));
  return records.map((s, i) => {
    if (typeof s === 'string') s = { description: s };
    if (!isObj(s)) return null;
    const acctRef = pickStr(s, ['account', 'account_id', 'accountid', 'customer']);
    const acct = acctRef ? (accById[acctRef.toLowerCase()] || accByName[acctRef.toLowerCase()]) : null;
    const description = pickStr(s, ['description', 'text', 'message', 'summary', 'detail', 'details', 'content', 'title']);
    const timestamp = pickStr(s, ['timestamp', 'time', 'at', 'created_at', 'date', 'occurred_at']);
    const id = pickStr(s, ['id', 'signal_id', 'event_id']);
    return {
      id, key: id || `${acctRef || ''}|${timestamp || ''}|${(description || JSON.stringify(s)).slice(0, 120)}`,
      type: pickStr(s, ['type', 'kind', 'event_type', 'category']),
      accountId: acct ? acct.id : (acctRef || null),
      description, timestamp,
      deal: pickStr(s, ['deal', 'deal_id', 'deal_title', 'related_deal']),
      locator: `signals[${i}]`, raw: s,
    };
  }).filter(Boolean);
}

/** Find allowed `kind` values for write_note (and any hints) inside the data-format schema. */
export function extractNoteKinds(schema) {
  const found = new Set();
  const walk = (node, key) => {
    if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
    if (!isObj(node)) return;
    for (const [k, v] of Object.entries(node)) {
      if (k.toLowerCase() === 'kind' && isObj(v) && Array.isArray(v.enum)) v.enum.forEach((x) => found.add(String(x)));
      if (k.toLowerCase() === 'kind' && Array.isArray(v) && v.every((x) => typeof x === 'string')) v.forEach((x) => found.add(x));
      walk(v, k);
    }
  };
  walk(schema, '');
  return [...found];
}
