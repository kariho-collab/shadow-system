import { useState } from 'react';
import { Moon, UserRound } from 'lucide-react';
import { api } from '../services/api.js';
import { useApp } from '../hooks/useApp.jsx';
import { Panel, Bar, Page } from '../components/ui.jsx';

const MODES = [['normal', 'Normal day'], ['low_energy', 'Low-energy day'], ['recovery', 'Recovery mode']];

export default function Status() {
  const { player: p, refresh, toast } = useApp();
  const [name, setName] = useState(p.user.name);
  const save = async () => {
    try { await api.updatePlayer({ name }); await refresh(); toast('Player name updated.'); } catch (e) { toast(e.message, 'error'); }
  };
  const setMode = async (m) => {
    try { await api.setMode(m); await refresh(); toast(m === 'normal' ? 'Back to normal mode.' : 'Rest counts. Your streak is safe.'); } catch (e) { toast(e.message, 'error'); }
  };
  return (
    <Page>
      <Panel title="PLAYER PROFILE">
        <div className="row wrap">
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <div className="avatar" aria-hidden><UserRound size={36} /></div>
            <div><div className="big">LV {p.level}</div><div className="dim">Rank {p.rank} · {p.totalXp} total XP · joined {p.user.created_at.slice(0, 10)}</div></div>
          </div>
          <div style={{ minWidth: 220 }}>
            <label>Player name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} /></label>
            <button onClick={save} disabled={!name.trim() || name === p.user.name} style={{ marginTop: 6 }}>Save name</button>
          </div>
        </div>
      </Panel>
      <div className="grid">
        <Panel title="PLAYER PROGRESS">
          <div className="row"><span>{p.xpIntoLevel} / {p.xpForNext} XP</span><span>{Math.round(p.progress * 100)}%</span></div>
          <Bar value={p.progress} label="Level progress" />
          <p className="dim">{p.totalQuests} quests completed · {p.streak}-day streak (best {p.longestStreak})</p>
        </Panel>
        <Panel title="RECOVERY">
          <p className="dim">No XP is ever removed. Rest days keep your streak.</p>
          <div className="row wrap" style={{ justifyContent: 'flex-start' }}>
            {MODES.map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={p.mode === m} className={p.mode === m ? 'on' : ''} style={p.mode === m ? { borderColor: 'var(--c-cyan)', color: 'var(--c-cyan)' } : null}>
                {m !== 'normal' && <Moon size={14} style={{ marginRight: 4 }} />}{label}
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="PLAYER ATTRIBUTES">
        <div className="grid">
          {p.attributes.map((a) => (
            <div key={a.name}><div className="row"><span>{a.name}</span><b>{a.value}</b></div><Bar value={a.progress} label={`${a.name} progress`} /></div>
          ))}
        </div>
      </Panel>
    </Page>
  );
}
