import { useState } from 'react';
import { useApp } from '../hooks/useApp.jsx';
import { Panel } from '../components/ui.jsx';

export default function Auth() {
  const { signIn } = useApp();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ username: '', password: '', name: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await signIn(mode, f); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth">
      <h1 className="big" style={{ fontSize: '1.8rem', letterSpacing: '0.25em', marginBottom: '1rem' }}>SHADOW SYSTEM</h1>
      <Panel title={mode === 'login' ? 'PLAYER LOGIN' : 'AWAKEN A NEW PLAYER'}>
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.8rem' }}>
          <label>Username<input value={f.username} onChange={set('username')} autoComplete="username" required minLength={3} maxLength={24} /></label>
          {mode === 'register' && <label>Player name<input value={f.name} onChange={set('name')} maxLength={24} /></label>}
          <label>Password (8+ characters)<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button disabled={busy}>{busy ? 'Connecting...' : mode === 'login' ? 'Log in' : 'Create player'}</button>
          <button type="button" className="ghost dim" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'New player? Awaken here' : 'Already awakened? Log in'}
          </button>
        </form>
      </Panel>
    </div>
  );
}
