import { Hono } from "hono";
import {
  createSession, deleteSession, getSession, getTokenFromCookie,
  setSessionCookie, clearSessionCookie, hashPin, verifyPin, type Role,
} from "../../lib/auth/session";

type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; pin: string }>();
  if (!body.email || !body.pin) return c.json({ error: "Email and PIN required" }, 400);

  const user = await c.env.DB.prepare(
    `SELECT id, name, email, role, pin_hash FROM users WHERE email = ?`
  ).bind(body.email.toLowerCase().trim()).first<{
    id: string; name: string; email: string; role: Role; pin_hash: string;
  }>();

  if (!user) return c.json({ error: "Invalid email or PIN" }, 401);
  const valid = await verifyPin(body.pin, user.pin_hash);
  if (!valid) return c.json({ error: "Invalid email or PIN" }, 401);

  const token = await createSession(c.env.SESSIONS, {
    userId: user.id,
    memberName: user.name,
    email: user.email,
    role: user.role,
  });

  return c.json({ ok: true, role: user.role, name: user.name }, 200, {
    "Set-Cookie": setSessionCookie(token),
  });
});

authRoutes.post("/logout", async (c) => {
  const token = getTokenFromCookie(c.req.header("Cookie") ?? null);
  if (token) await deleteSession(c.env.SESSIONS, token);
  return c.json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
});

authRoutes.get("/me", async (c) => {
  const token = getTokenFromCookie(c.req.header("Cookie") ?? null);
  const session = await getSession(c.env.SESSIONS, token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ memberName: session.memberName, role: session.role, email: session.email });
});

authRoutes.post("/change-pin", async (c) => {
  const token = getTokenFromCookie(c.req.header("Cookie") ?? null);
  const session = await getSession(c.env.SESSIONS, token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ currentPin: string; newPin: string }>();
  if (!body.currentPin || !body.newPin) return c.json({ error: "Current and new PIN required" }, 400);
  if (body.newPin.length < 4) return c.json({ error: "PIN must be at least 4 characters" }, 400);

  const user = await c.env.DB.prepare(`SELECT pin_hash FROM users WHERE id = ?`)
    .bind(session.userId).first<{ pin_hash: string }>();
  if (!user) return c.json({ error: "User not found" }, 404);

  const valid = await verifyPin(body.currentPin, user.pin_hash);
  if (!valid) return c.json({ error: "Current PIN is incorrect" }, 401);

  const newHash = await hashPin(body.newPin);
  await c.env.DB.prepare(`UPDATE users SET pin_hash = ? WHERE id = ?`).bind(newHash, session.userId).run();
  return c.json({ ok: true });
});
