import { useState } from 'react';
import { api } from '../services/api.js';
import { useApp } from './useApp.jsx';

/** Completes a quest on the server (it decides the XP) and shows every System message that results. */
export function useComplete(reload) {
  const { refresh, toast, setLevelUp } = useApp();
  const [busy, setBusy] = useState(null);
  const complete = async (q) => {
    setBusy(q.id);
    try {
      const r = await api.completeQuest(q.id);
      toast('Quest completed.'); toast(`Experience acquired: +${r.xpAwarded} XP.`);
      if (r.progression) toast(`Training intensity increased: ${r.progression.exercise} is now ${r.progression.label}.`);
      r.unlocked.skills.forEach((s) => toast(`Skill unlocked: ${s}.`));
      r.unlocked.achievements.forEach((a) => toast(`Achievement unlocked: ${a}.`));
      if (r.leveledUp) setLevelUp(r);
      await Promise.all([reload(), refresh()]);
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(null); }
  };
  return { complete, busy };
}
