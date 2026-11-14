import { useStore } from '../lib/store.jsx';

const relColor = { Ally: '#22c55e', Warm: '#4ade80', Neutral: '#3b82f6', Guarded: '#f59e0b', Unknown: '#64748b' };
const roleLabel = { decision_maker: 'Decision maker', economic_buyer: 'Budget owner', user: 'User', champion: 'Champion', blocker: 'Blocker', influencer: 'Influencer' };
export const roleName = (r) => roleLabel[r] || 'Role unknown';

/** Radial stakeholder map. Only people present in the data are drawn. */
export default function StakeholderMap({ account, people, roleOf }) {
  const { setDrawer } = useStore();
  if (!people.length) return <p className="text-sm text-slate-400">No stakeholders recorded for this account.</p>;
  const W = 640, H = 360, cx = W / 2, cy = H / 2, rx = 240, ry = 128;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-navy-900" role="img" aria-label={`Stakeholder map for ${account}`}>
        <circle cx={cx} cy={cy} r={46} fill="#17274a" stroke="#3b82f6" strokeWidth="2" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="#e2e8f0">{account.length > 16 ? account.slice(0, 15) + '…' : account}</text>
        {people.map((p, i) => {
          const ang = (i / people.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + rx * Math.cos(ang), y = cy + ry * Math.sin(ang);
          const rel = p.relationship || 'Unknown', role = roleOf(p);
          const unmet = p.met === false;
          return (
            <g key={p.key} style={{ cursor: 'pointer' }} onClick={() => p.evidenceId && setDrawer(p.evidenceId)}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke={relColor[rel]} strokeWidth={role === 'decision_maker' || role === 'economic_buyer' ? 3 : 1.5} strokeDasharray={unmet ? '5 4' : undefined} opacity="0.7" />
              <circle cx={x} cy={y} r={role === 'decision_maker' ? 26 : 20} fill="#0b1426" stroke={role === 'blocker' ? '#ef4444' : relColor[rel]} strokeWidth="3" strokeDasharray={unmet ? '4 3' : undefined} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e2e8f0">{p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</text>
              <text x={x} y={y + (role === 'decision_maker' ? 40 : 34)} textAnchor="middle" fontSize="10.5" fill="#cbd5e1">{p.name.length > 18 ? p.name.slice(0, 17) + '…' : p.name}</text>
              <text x={x} y={y + (role === 'decision_maker' ? 52 : 46)} textAnchor="middle" fontSize="9.5" fill="#94a3b8">{roleName(role)}{unmet ? ' · not met' : ''}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
        {Object.entries(relColor).map(([k, c]) => <span key={k} className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />{k}</span>)}
        <span>Dashed = not yet met · Thick line = decision maker / budget owner · Red ring = blocker</span>
      </div>
    </div>
  );
}
