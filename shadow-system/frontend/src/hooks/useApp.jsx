import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, hasToken, setToken } from '../services/api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [player, setPlayer] = useState(null);
  const [booting, setBooting] = useState(hasToken());
  const [toasts, setToasts] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [sound, setSound] = useState(true);

  const toast = useCallback((message, kind = 'info') => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const refresh = useCallback(async () => {
    try { setPlayer(await api.player()); }
    catch (e) { if (e.status === 401) { setToken(null); setPlayer(null); } else toast(e.message, 'error'); }
  }, [toast]);
  useEffect(() => { if (hasToken()) refresh().finally(() => setBooting(false)); }, [refresh]);

  const signIn = async (mode, body) => {
    const { token } = await api[mode](body);
    setToken(token);
    await refresh();
  };
  const signOut = () => { setToken(null); setPlayer(null); };

  const value = useMemo(() => ({ player, booting, refresh, signIn, signOut, toast, toasts, levelUp, setLevelUp, sound, setSound }),
    [player, booting, refresh, toast, toasts, levelUp, sound]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Load data for a page with loading and error state. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    try { setData(await fn()); setError(null); } catch (e) { setError(e.message); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload, loading: !data && !error };
}
