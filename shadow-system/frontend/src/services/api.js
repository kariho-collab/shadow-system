const BASE = import.meta.env.VITE_API_URL || '/api';
let token = null;
try { token = localStorage.getItem('ss_token'); } catch { /* storage unavailable */ }

export function setToken(t) {
  token = t;
  try { t ? localStorage.setItem('ss_token', t) : localStorage.removeItem('ss_token'); } catch { /* ignore */ }
}
export const hasToken = () => !!token;

async function req(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the System. Is the backend running?'), { status: 0 });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed.'), { status: res.status });
  return data;
}

export const api = {
  register: (b) => req('/auth/register', { method: 'POST', body: b }),
  login: (b) => req('/auth/login', { method: 'POST', body: b }),
  player: () => req('/player'),
  updatePlayer: (b) => req('/player', { method: 'PATCH', body: b }),
  quests: () => req('/quests'),
  createQuest: (b) => req('/quests', { method: 'POST', body: b }),
  updateQuest: (id, b) => req(`/quests/${id}`, { method: 'PUT', body: b }),
  deleteQuest: (id) => req(`/quests/${id}`, { method: 'DELETE' }),
  completeQuest: (id) => req(`/quests/${id}/complete`, { method: 'POST' }),
  lightenQuest: (id) => req(`/quests/${id}/lighten`, { method: 'POST' }),
  setMode: (mode) => req('/recovery', { method: 'POST', body: { mode } }),
  skills: () => req('/skills'),
  achievements: () => req('/achievements'),
  notifications: () => req('/notifications'),
  readNotifications: () => req('/notifications/read', { method: 'POST' }),
  analytics: () => req('/analytics'),
};
