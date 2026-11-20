import { Lock, Trophy } from 'lucide-react';
import { api } from '../services/api.js';
import { useLoad } from '../hooks/useApp.jsx';
import { Panel, Page, Loading, ErrorBox } from '../components/ui.jsx';

export default function Achievements() {
  const { data, error, loading, reload } = useLoad(api.achievements);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <Page>
      <div className="grid">
        {data.map((a) => (
          <Panel key={a.code} title={a.name} className={a.unlocked_at ? '' : 'locked'}>
            <div style={{ opacity: a.unlocked_at ? 1 : 0.5 }}>
              <div className="row" style={{ justifyContent: 'flex-start' }}>
                {a.unlocked_at ? <Trophy size={18} color="var(--c-cyan)" /> : <Lock size={18} />}
                <span>{a.description}</span>
              </div>
              <div className="dim">{a.unlocked_at ? `Unlocked ${a.unlocked_at.slice(0, 10)}` : 'Locked'}</div>
            </div>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
