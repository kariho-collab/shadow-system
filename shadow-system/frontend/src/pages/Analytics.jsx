import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api.js';
import { useLoad } from '../hooks/useApp.jsx';
import { Panel, Bar, Page, Loading, ErrorBox } from '../components/ui.jsx';

const axis = { stroke: '#6f8fb3', fontSize: 12 };
const tip = { contentStyle: { background: '#06101f', border: '1px solid #3cb4ff' }, labelStyle: { color: '#6ff3ff' } };

export default function Analytics() {
  const { data: a, error, loading, reload } = useLoad(api.analytics);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const max = Math.max(1, ...a.byCategory.map((c) => c.xp));
  const daily = a.daily.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <Page>
      <Panel title="XP EARNED, LAST 30 DAYS">
        <div style={{ height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={daily}>
              <CartesianGrid stroke="rgba(60,170,255,.15)" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={4} /><YAxis {...axis} allowDecimals={false} />
              <Tooltip {...tip} /><RBar dataKey="xp" name="XP" fill="#3cb4ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="grid">
        <Panel title="WEEKLY CONSISTENCY">
          <div className="big">{a.weekly.activeDays}/7</div>
          <p className="dim">active or rest days · {a.weekly.questsCompleted} quests this week</p>
        </Panel>
        <Panel title="SKILL DEVELOPMENT">
          <div className="big">{a.skillProgress.unlocked}/{a.skillProgress.total}</div>
          <p className="dim">skills unlocked</p>
        </Panel>
      </div>
      <Panel title="DAILY QUEST COMPLETION">
        <div style={{ height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={daily}>
              <XAxis dataKey="label" {...axis} interval={4} /><YAxis {...axis} allowDecimals={false} />
              <Tooltip {...tip} /><RBar dataKey="quests" name="Quests" fill="#6ff3ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="PROGRESS BY CATEGORY">
        {a.byCategory.map((c) => (
          <div key={c.category} style={{ marginBottom: 10 }}>
            <div className="row"><span>{c.category}</span><span className="dim">{c.xp} XP · {c.completed} quests</span></div>
            <Bar value={c.xp / max} label={`${c.category} XP`} />
          </div>
        ))}
      </Panel>
      <Panel title="HISTORICAL PERFORMANCE">
        {a.history.length === 0 ? <p className="dim">No XP transactions yet. Complete a quest to start your record.</p>
          : a.history.map((h) => <div key={h.id} className="row"><span>{h.reason}</span><span className="dim">{h.created_at.slice(0, 10)} · +{h.amount} XP</span></div>)}
      </Panel>
    </Page>
  );
}
