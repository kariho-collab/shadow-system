import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { api } from '../services/api.js';
import { useApp, useLoad } from '../hooks/useApp.jsx';
import { useComplete } from '../hooks/useComplete.js';
import { Panel, Bar, Page, Loading, ErrorBox } from '../components/ui.jsx';

export default function Training() {
  const { player, toast } = useApp();
  const { data, error, loading, reload } = useLoad(api.quests);
  const { complete, busy } = useComplete(reload);
  const prevDone = useRef(null);
  const list = (data ?? []).filter((q) => q.kind === 'training');
  const done = list.filter((q) => q.completed_today).length;

  useEffect(() => {
    if (prevDone.current !== null && prevDone.current < list.length && done === list.length && list.length) toast('Daily quest cleared. Rest well.');
    if (data) prevDone.current = done;
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const resting = player.mode !== 'normal';
  return (
    <Page>
      <Panel title="[ DAILY QUEST: STRENGTH TRAINING ]">
        <p className="dim" style={{ marginTop: 0 }}>
          GOAL: complete today’s training. Resets every day. There is no penalty for missing a day.
        </p>
        {resting && <p style={{ color: 'var(--c-warn)' }}>Recovery mode is on: today’s targets are halved. You still earn full XP.</p>}
        {list.length === 0 && <p className="dim">No training quests found. Create BODY quests on the Daily Quests page.</p>}
        {list.map((q) => (
          <div key={q.id} className={`quest ${q.completed_today ? 'done' : ''}`}>
            <button
              className="tick" onClick={() => complete(q)} disabled={q.completed_today || busy === q.id}
              aria-label={q.completed_today ? `${q.title} completed` : `Mark ${q.title} complete`}
              style={{ width: 40, height: 40, padding: 0, display: 'grid', placeItems: 'center', borderColor: q.completed_today ? 'var(--c-ok)' : undefined }}
            >{q.completed_today && <Check size={22} color="var(--c-ok)" />}</button>
            <div className="grow">
              <div className="row"><b style={{ fontSize: '1.15rem' }}>{q.title}</b><span className="big" style={{ fontSize: '1.4rem' }}>{q.target_label}</span></div>
              <div className="dim">{q.description}</div>
              <Bar value={q.target / q.goal} label={`${q.title} progress to goal`} />
              <div className="dim" style={{ fontSize: '0.85rem' }}>
                Goal {q.goal_label} · {q.at_goal ? 'goal reached' : `target rises in ${q.sessions_to_next} normal-day session${q.sessions_to_next === 1 ? '' : 's'}`} · +{q.xp_reward} XP
              </div>
            </div>
          </div>
        ))}
        <div className="row"><span>Cleared {done} / {list.length}</span><span className="dim">Rewards go to the System, not to your ego.</span></div>
        <Bar value={list.length ? done / list.length : 0} label="Daily training cleared" />
      </Panel>
      <Panel title="TRAIN SAFELY">
        <p style={{ margin: 0 }}>
          Stop if you feel pain, dizziness or chest tightness. Warm up first and drink water. Targets only rise after
          five normal-day sessions, and you can always do less on a bad day. If you have an injury or a health condition,
          check with a doctor before you start.
        </p>
      </Panel>
    </Page>
  );
}
