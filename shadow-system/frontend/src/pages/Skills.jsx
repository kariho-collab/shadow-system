import { ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { useLoad } from '../hooks/useApp.jsx';
import { Panel, Page, Loading, ErrorBox } from '../components/ui.jsx';

export default function Skills() {
  const { data, error, loading, reload } = useLoad(api.skills);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const branches = [...new Set(data.map((s) => s.branch))];
  return (
    <Page>
      {branches.map((b) => {
        const list = data.filter((s) => s.branch === b);
        return (
          <Panel key={b} title={b}>
            <p className="dim">{list[0].categoryXp} XP in {list[0].category}</p>
            <div className="chain">
              {list.map((s, i) => (
                <span key={s.id} className="chain">
                  <div className={`node ${s.unlocked ? 'up' : ''}`}>
                    {s.name}<div className="dim" style={{ fontSize: '0.8rem' }}>{s.unlocked ? 'Unlocked' : `${s.xp_required} XP`}</div>
                  </div>
                  {i < list.length - 1 && <ArrowRight size={16} className="dim" aria-hidden />}
                </span>
              ))}
            </div>
          </Panel>
        );
      })}
    </Page>
  );
}
