import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, Award, BarChart3, Dumbbell, LogOut, ScrollText, Swords, Network, Volume2, VolumeX } from 'lucide-react';
import { AppProvider, useApp } from './hooks/useApp.jsx';
import { InitSequence, LevelUpOverlay, Toasts } from './components/Overlays.jsx';
import { Loading } from './components/ui.jsx';
import Auth from './pages/Auth.jsx';
import Training from './pages/Training.jsx';
import Status from './pages/Status.jsx';
import Quests from './pages/Quests.jsx';
import Skills from './pages/Skills.jsx';
import Achievements from './pages/Achievements.jsx';
import Analytics from './pages/Analytics.jsx';
import Log from './pages/Log.jsx';

const NAV = [
  ['training', 'Daily Training', Dumbbell, Training], ['status', 'Status', Activity, Status], ['quests', 'Daily Quests', Swords, Quests], ['skills', 'Skill Tree', Network, Skills],
  ['achievements', 'Achievements', Award, Achievements], ['analytics', 'Analytics', BarChart3, Analytics], ['log', 'System Log', ScrollText, Log],
];

function Shell() {
  const { player, signOut, sound, setSound } = useApp();
  const [page, setPage] = useState('training');
  const View = NAV.find((n) => n[0] === page)[3];
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="System menu">
        <div className="brand">SHADOW SYSTEM</div>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} className={page === id ? 'on' : ''} onClick={() => setPage(id)} aria-current={page === id ? 'page' : undefined}><Icon size={16} />{label}</button>
        ))}
        <div className="spacer" />
        <button onClick={() => setSound(!sound)} aria-pressed={sound}>{sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Sound</button>
        <button onClick={signOut}><LogOut size={16} />Log out</button>
      </nav>
      <main className="content"><AnimatePresence mode="wait"><View key={`${page}-${player.level}`} /></AnimatePresence></main>
    </div>
  );
}

function Gate() {
  const { player, booting } = useApp();
  const [initDone, setInitDone] = useState(() => { try { return sessionStorage.getItem('ss_init') === '1'; } catch { return false; } });
  const finish = () => { try { sessionStorage.setItem('ss_init', '1'); } catch { /* ignore */ } setInitDone(true); };
  return (
    <>
      <AnimatePresence>{!initDone && <InitSequence key="init" onDone={finish} />}</AnimatePresence>
      {booting ? <div style={{ padding: 24 }}><Loading /></div> : player ? <Shell /> : <Auth />}
      <LevelUpOverlay /><Toasts />
    </>
  );
}
export default function App() { return <AppProvider><Gate /></AppProvider>; }
