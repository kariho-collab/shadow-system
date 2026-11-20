import { useState } from 'react';
import { api } from '../services/api.js';
import { useApp, useLoad } from '../hooks/useApp.jsx';
import { useComplete } from '../hooks/useComplete.js';
import { Panel, Page, Loading, ErrorBox, Empty, Confirm, cap } from '../components/ui.jsx';

const CATS = ['BODY', 'ACADEMY', 'CYBER FORGE', 'QUANT LAB', 'WEALTH', 'INNER KINGDOM'];
const DIFFS = { easy: 10, normal: 25, hard: 50, elite: 100 };
const blank = { title: '', description: '', category: 'BODY', difficulty: 'normal', deadline: '' };

function QuestForm({ initial, onSave, onCancel }) {
  const [f, setF] = useState({ ...blank, ...initial, deadline: initial?.deadline ?? '', description: initial?.description ?? '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Panel title={initial?.id ? 'EDIT QUEST' : 'NEW QUEST'}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        <div className="form-grid">
          <label>Title<input value={f.title} onChange={set('title')} maxLength={80} required autoFocus /></label>
          <label>Category<select value={f.category} onChange={set('category')}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Difficulty<select value={f.difficulty} onChange={set('difficulty')}>{Object.entries(DIFFS).map(([d, x]) => <option key={d} value={d}>{cap(d)} (+{x} XP)</option>)}</select></label>
          <label>Deadline<input type="date" value={f.deadline} onChange={set('deadline')} /></label>
        </div>
        <label>Description<textarea rows={2} value={f.description} onChange={set('description')} maxLength={200} /></label>
        <div className="row" style={{ justifyContent: 'flex-start', marginTop: 8 }}><button>Save quest</button><button type="button" onClick={onCancel}>Cancel</button></div>
      </form>
    </Panel>
  );
}

export default function Quests() {
  const { player, toast } = useApp();
  const { data, error, loading, reload } = useLoad(api.quests);
  const [form, setForm] = useState(null); // null | {} | quest
  const [del, setDel] = useState(null);
  const { complete, busy } = useComplete(reload);
  const resting = player.mode !== 'normal';
  const run = async (fn) => { try { await fn(); } catch (e) { toast(e.message, 'error'); } };

  const save = (f) => run(async () => {
    const body = { title: f.title, description: f.description, category: f.category, difficulty: f.difficulty, deadline: f.deadline };
    if (f.id) await api.updateQuest(f.id, body); else await api.createQuest(body);
    setForm(null); await reload();
  });
  const lighten = (q) => run(async () => { await api.lightenQuest(q.id); toast('Quest difficulty reduced.'); await reload(); });
  const remove = () => run(async () => { await api.deleteQuest(del.id); setDel(null); toast('Quest deleted. Earned XP is kept.'); await reload(); });

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  const custom = data.filter((q) => q.kind !== 'training');
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Page>
      {resting && <Panel><p>Recovery mode is on. Lighten any quest, or just rest. Nothing is lost.</p></Panel>}
      {form ? <QuestForm initial={form} onSave={save} onCancel={() => setForm(null)} /> : <p><button onClick={() => setForm({})}>New quest</button></p>}
      {custom.length === 0 && <Empty>No quests yet. Create your first quest to begin.</Empty>}
      {CATS.map((c) => {
        const list = custom.filter((q) => q.category === c);
        return list.length > 0 && (
          <Panel key={c} title={c}>
            {list.map((q) => (
              <div key={q.id} className={`quest ${q.completed_today ? 'done' : ''}`}>
                <div className="grow">
                  <b>{q.title}</b>
                  {q.description && <div className="dim">{q.description}</div>}
                  <span className="tag">{cap(q.difficulty)} · +{q.xp_reward} XP</span>{' '}
                  {q.deadline && <span className="tag">due {q.deadline}{q.deadline < today && !q.completed_today ? ' (overdue, no penalty)' : ''}</span>}
                </div>
                {q.completed_today ? <span className="ok">Completed</span> : <button disabled={busy === q.id} onClick={() => complete(q)}>Complete</button>}
                {resting && !q.completed_today && q.difficulty !== 'easy' && <button onClick={() => lighten(q)}>Lighten</button>}
                <button onClick={() => setForm(q)} aria-label={`Edit ${q.title}`}>Edit</button>
                <button className="danger" onClick={() => setDel(q)} aria-label={`Delete ${q.title}`}>Delete</button>
              </div>
            ))}
          </Panel>
        );
      })}
      {del && <Confirm message={`Delete “${del.title}”? XP you already earned is kept.`} onYes={remove} onNo={() => setDel(null)} />}
    </Page>
  );
}
