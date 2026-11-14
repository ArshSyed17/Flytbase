export const money = (n, cur) => (n == null ? 'Unknown' : `${cur && cur.length === 1 ? cur : '$'}${Number(n).toLocaleString('en-US')}`);
export const moneyCompact = (n) => (n == null ? 'Unknown' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n));
export const dt = (ms) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never');
export const unknown = (v) => (v == null || v === '' ? 'Unknown' : v);
export const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const STAGES = ['Identified', 'Qualified', 'Blocker Cleared', 'Agreed'];
export const COLORS = { critical: '#ef4444', warning: '#f59e0b', healthy: '#22c55e', blue: '#3b82f6', slate: '#64748b' };
export const stageColor = { Identified: '#64748b', Qualified: '#3b82f6', 'Blocker Cleared': '#06b6d4', Agreed: '#22c55e', Unknown: '#475569' };
