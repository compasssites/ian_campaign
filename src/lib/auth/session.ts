import {tokenDigest,matchesDigest} from "./security";
export type Role = "superadmin" | "admin" | "member";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export interface Session {
  userId: string;
  memberName: string;
  email: string;
  role: Role;
  token: string;
  authVersion: number;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  kv: KVNamespace,
  data: { userId: string; memberName: string; email: string; role: Role; authVersion?: number }
): Promise<string> {
  const token = randomToken();
  await kv.put("session:"+await tokenDigest(token), JSON.stringify({...data,authVersion:data.authVersion??0}), { expirationTtl: SESSION_TTL });
  return token;
}

export async function getSession(kv: KVNamespace, token: string, db: D1Database): Promise<Session | null> {
  if (!token) return null;
  const digest=await tokenDigest(token);
  const revoked=await db.prepare("SELECT token_hash FROM session_revocations WHERE token_hash=?").bind(digest).first();
  if(revoked)return null;
  const raw = await kv.get("session:"+digest) || await kv.get(token);
  if (!raw) return null;
  const data = JSON.parse(raw) as Omit<Session, "token">;
  const user=await db.prepare("SELECT id,name,email,role,auth_version FROM users WHERE id=?").bind(data.userId).first<{id:string;name:string;email:string;role:Role;auth_version:number}>();
  if(!user || Number(data.authVersion??0)!==Number(user.auth_version))return null;
  return {...data,token,memberName:user.name,email:user.email,role:user.role,authVersion:user.auth_version};
}

export async function deleteSession(kv: KVNamespace, token: string, db: D1Database): Promise<void> {
  const digest=await tokenDigest(token);
  await db.prepare("INSERT INTO session_revocations (token_hash,expires_at) VALUES (?,?) ON CONFLICT(token_hash) DO NOTHING").bind(digest,Date.now()+SESSION_TTL*1000).run();
  await kv.delete("session:"+digest);
  await kv.delete(token);
  await db.prepare("DELETE FROM session_revocations WHERE expires_at<?").bind(Date.now()).run();
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

function hex(bytes: Uint8Array) {return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
async function derive(pin: string,salt: Uint8Array) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new Uint8Array(salt),iterations:100000},key,256)));
}
export async function hashPin(pin: string): Promise<string> {
 const salt=crypto.getRandomValues(new Uint8Array(16));return `pbkdf2$100000$${hex(salt)}$${await derive(pin,salt)}`;
}
export async function verifyPin(pin: string,hash: string): Promise<boolean> {
 if(!hash.startsWith('pbkdf2$'))return matchesDigest(await tokenDigest(pin),hash);
 const parts=hash.split('$');if(parts.length!==4 || parts[1]!=='100000' || !/^[0-9a-f]{32}$/.test(parts[2]) || !/^[0-9a-f]{64}$/.test(parts[3]))return false;
 const salt=Uint8Array.from(parts[2].match(/../g)!,x=>parseInt(x,16));return matchesDigest(await derive(pin,salt),parts[3]);
}
