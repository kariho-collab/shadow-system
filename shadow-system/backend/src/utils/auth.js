import crypto from 'node:crypto';

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [alg, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const a = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const sig = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

export function signToken(payload, secret, ttlHours = 72) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlHours * 3600 };
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(body)}`;
  return `${data}.${sig(data, secret)}`;
}
export function verifyToken(token, secret) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sig(`${parts[0]}.${parts[1]}`, secret));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const body = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return body.exp > Date.now() / 1000 ? body : null;
  } catch { return null; }
}
