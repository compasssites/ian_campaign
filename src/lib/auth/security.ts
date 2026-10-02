// Minimal structural D1 type keeps this existing app independent of new tooling packages.
type D1Database = { prepare(sql: string): { bind(...values: (string | number)[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> } } };
const WINDOW_MS = 15 * 60 * 1000;

export async function tokenDigest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function matchesDigest(left: string, right: string) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

export function clientNetwork(ip: string | undefined) {
  if (!ip) return 'unknown';
  if (!ip.includes(':')) {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
      ? parts.map(Number).join('.') : 'unknown';
  }
  try {
    const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    const halves = normalized.split('::');
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const parts = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
    return `v6:${parts.slice(0, 4).map(part => part.padStart(4, '0')).join(':')}/64`;
  } catch { return 'unknown'; }
}

export async function reserveAttempt(db: D1Database, key: string, limit: number, now = Date.now(), windowMs = WINDOW_MS) {
  const row = await db.prepare(`INSERT INTO auth_request_limits (key, count, window_start) VALUES (?1, 1, ?2)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN window_start <= ?2 - ?3 THEN 1 ELSE MIN(count + 1, ?4 + 1) END,
      window_start = CASE WHEN window_start <= ?2 - ?3 THEN ?2 ELSE window_start END
    RETURNING count, window_start`).bind(key, now, windowMs, limit).first<{ count: number; window_start: number }>();
  if (!row) throw new Error('auth_protection_unavailable');
  return { allowed: row.count <= limit, retryAfter: Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000)) };
}

type AuthContext = {
  env: { DB: D1Database };
  req: { header(name: string): string | undefined };
  header(name: string, value: string): void;
  json(body: Record<string, string>, status: 429 | 503): Response;
};
export async function limitCredentials(c: AuthContext, purpose: string, account: string, accountLimit = 10, windowMs = WINDOW_MS, networkLimit = 120) {
  try {
    // CF-Connecting-IP is supplied by Cloudflare on the deployed Worker; never use client X-Forwarded-For.
    const networkKey = await tokenDigest(`network:${purpose}:${clientNetwork(c.req.header('CF-Connecting-IP'))}`);
    const network = await reserveAttempt(c.env.DB, networkKey, networkLimit, Date.now(), windowMs);
    if (!network.allowed) {
      c.header('Retry-After', String(network.retryAfter));
      return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
    }
    const accountKey = await tokenDigest(`account:${purpose}:${account.trim().toLowerCase()}`);
    const result = await reserveAttempt(c.env.DB, accountKey, accountLimit, Date.now(), windowMs);
    if (!result.allowed) {
      c.header('Retry-After', String(result.retryAfter));
      return c.json({ error: 'Too many attempts. Please try again later.' }, 429);
    }
    await c.env.DB.prepare('DELETE FROM auth_request_limits WHERE window_start < ?').bind(Date.now() - 24 * 60 * 60 * 1000).run();
    return null;
  } catch {
    console.error('auth_protection_unavailable');
    c.header('Retry-After', '60');
    return c.json({ error: 'Sign-in protection is temporarily unavailable. Please try again shortly.' }, 503);
  }
}
