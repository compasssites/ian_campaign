export type Role = "superadmin" | "admin" | "member";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: string;
  memberName: string;
  email: string;
  role: Role;
  token: string;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  kv: KVNamespace,
  data: { userId: string; memberName: string; email: string; role: Role }
): Promise<string> {
  const token = randomToken();
  await kv.put(token, JSON.stringify(data), { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(kv: KVNamespace, token: string): Promise<Session | null> {
  if (!token) return null;
  const raw = await kv.get(token);
  if (!raw) return null;
  const data = JSON.parse(raw) as Omit<Session, "token">;
  return { ...data, token };
}

export async function deleteSession(kv: KVNamespace, token: string): Promise<void> {
  await kv.delete(token);
}

export function getTokenFromCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : "";
}

export function setSessionCookie(token: string): string {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export function clearSessionCookie(): string {
  return `session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin);
  return computed === hash;
}
