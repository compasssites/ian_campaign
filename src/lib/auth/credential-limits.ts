import { clientNetwork, reserveAttempt, tokenDigest } from './security';
const rules: Record<string, {short: number; hour: number}> = {
 '/api/auth/login': {short:10,hour:30},
 '/api/auth/change-pin': {short:10,hour:30},
 '/api/users': {short:10,hour:30},
 '/api/users/reset-pin': {short:10,hour:30},
 '/api/users/:id': {short:10,hour:30},
};
export function securityReply(error: string, status: number, retry?: number) {
 return new Response(JSON.stringify({error}), {status, headers: {'Content-Type':'application/json', 'Cache-Control':'no-store', ...(retry ? {'Retry-After':String(retry)} : {})}});
}
export async function protectCredentialRequest(request: Request, db: Parameters<typeof reserveAttempt>[0], sessionAccount?: () => Promise<string | null>) {
 const url = new URL(request.url);
 if (['GET','HEAD','OPTIONS'].includes(request.method)) return null;
 const origin = request.headers.get('Origin');
 if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return securityReply('Request origin is not allowed.',403);
 const path=url.pathname.replace(/\/$/,'');const key=path.startsWith('/api/users/') && path!=='/api/users/reset-pin'?'/api/users/:id':path;
 const rule=rules[key];if(!rule)return null;
 const cap = url.pathname.includes('/passkeys/') ? 65536 : 8192;
 if (Number(request.headers.get('Content-Length')) > cap) return securityReply('Request too large.',413);
 let body: Record<string, unknown> = {};
 try {
  const reader = request.clone().body?.getReader(), chunks: Uint8Array[] = []; let size = 0;
  if (reader) for (;;) { const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>cap){void reader.cancel();return securityReply('Request too large.',413);}chunks.push(value); }
  const bytes = new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return securityReply('Enter valid request details.',400);
  body = parsed as Record<string, unknown>;
  for (const field of ['identifier','pin','currentPin','newPin']) if(body[field]!==undefined && (typeof body[field]!=='string' || body[field].length>1024)) return securityReply('Enter valid request details.',400);
 } catch { return securityReply('Enter valid request details.',400); }
 try {
  const network = clientNetwork(request.headers.get('CF-Connecting-IP') ?? undefined);
  for(const [suffix,window,limit] of [['short',900000,120],['hour',3600000,600]] as const){
   const result=await reserveAttempt(db,await tokenDigest(`network:${url.pathname}:${suffix}:${network}`),limit,Date.now(),window);
   if(!result.allowed)return securityReply('Too many attempts. Please try again later.',429,result.retryAfter);
  }
  let account=String(body.identifier ?? '').trim().toLowerCase();
  if(path!=='/api/auth/login') { const user=await sessionAccount?.();if(!user)return securityReply('Please sign in to continue.',401);account=user; }
  for(const [suffix,window,limit] of [['short',900000,rule.short],['hour',3600000,rule.hour]] as const){
   const result=await reserveAttempt(db,await tokenDigest(`account:${url.pathname}:${suffix}:${account}`),limit,Date.now(),window);
   if(!result.allowed)return securityReply('Too many attempts. Please try again later.',429,result.retryAfter);
  }
  await db.prepare('DELETE FROM auth_request_limits WHERE window_start < ?').bind(Date.now()-86400000).run();
 } catch { console.error('auth_protection_unavailable');return securityReply('Sign-in protection is temporarily unavailable. Please try again shortly.',503,60); }
 return null;
}
