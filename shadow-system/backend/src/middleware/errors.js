export const notFound = (_req, res) => res.status(404).json({ error: 'Not found.' });
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  if (err.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message)) return res.status(409).json({ error: 'Reward already claimed today.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}
