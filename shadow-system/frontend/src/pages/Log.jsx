import { useEffect } from 'react';
import { api } from '../services/api.js';
import { useLoad } from '../hooks/useApp.jsx';
import { Panel, Page, Loading, ErrorBox } from '../components/ui.jsx';

export default function Log() {
  const { data, error, loading, reload } = useLoad(api.notifications);
  useEffect(() => { api.readNotifications().catch(() => {}); }, []);
  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  return (
    <Page>
      <Panel title="NOTIFICATIONS">
        {data.length === 0 && <p className="dim">No messages yet.</p>}
        {data.map((n) => (
          <div key={n.id} className="row" style={{ marginBottom: 6 }}>
            <span><b style={{ color: 'var(--c-cyan)' }}>[ SYSTEM ]</b> {n.message}</span>
            <span className="dim">{n.created_at.slice(0, 10)}</span>
          </div>
        ))}
      </Panel>
    </Page>
  );
}
