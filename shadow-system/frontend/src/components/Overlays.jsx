import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../hooks/useApp.jsx';

const LINES = ['SYSTEM INITIALIZING...', 'SCANNING...', 'PLAYER IDENTIFIED.', 'YOU HAVE BEEN CHOSEN TO AWAKEN.'];

export function InitSequence({ onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= LINES.length) { const t = setTimeout(onDone, 900); return () => clearTimeout(t); }
    const t = setTimeout(() => setN((x) => x + 1), 800);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <motion.div className="overlay" style={{ background: '#000' }} exit={{ opacity: 0 }} role="status" aria-live="polite">
      <div className="scanline" />
      <div className="init">{LINES.slice(0, n).map((l) => <motion.div key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{l}</motion.div>)}</div>
      <button className="ghost dim" onClick={onDone}>Skip</button>
    </motion.div>
  );
}

function beep() {
  try {
    const a = new AudioContext(), o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(440, a.currentTime); o.frequency.exponentialRampToValueAtTime(880, a.currentTime + 0.5);
    o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.08, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.9);
    o.start(); o.stop(a.currentTime + 0.9);
  } catch { /* audio unavailable */ }
}

export function LevelUpOverlay() {
  const { levelUp, setLevelUp, sound } = useApp();
  useEffect(() => { if (levelUp && sound) beep(); }, [levelUp, sound]);
  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Level up">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120 }}>
            <div className="levelup">LEVEL UP</div>
            <div className="big" style={{ margin: '1rem 0' }}>{levelUp.level}</div>
            <p className="dim">Experience gained: +{levelUp.xpAwarded} XP · Rank {levelUp.rank}</p>
            <p>Your attributes are developing.</p>
            <button onClick={() => setLevelUp(null)} autoFocus>Continue</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className={`toast ${t.kind}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
            <b>[ {t.kind === 'error' ? 'ERROR' : 'SYSTEM'} ]</b>
            <div>{t.message}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
