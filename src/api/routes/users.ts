import { Hono } from "hono";
import { hashPin, type Role } from "../../lib/auth/session";

type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };
type Variables = { memberName: string; role: Role; userId: string };

export const userRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function ulid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// List all users — superadmin only
userRoutes.get("/", async (c) => {
  if (c.get("role") !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`
  ).all();
  return c.json(results);
});

// Create user — superadmin only
userRoutes.post("/", async (c) => {
  if (c.get("role") !== "superadmin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ name: string; email: string; pin: string; role: Role }>();
  if (!body.name || !body.email || !body.pin) return c.json({ error: "Name, email and PIN required" }, 400);

  const allowed: Role[] = ["superadmin", "admin", "member"];
  if (!allowed.includes(body.role)) return c.json({ error: "Invalid role" }, 400);

  const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
    .bind(body.email.toLowerCase()).first();
  if (existing) return c.json({ error: "Email already registered" }, 409);

  const id = ulid();
  const pin_hash = await hashPin(body.pin);
  await c.env.DB.prepare(
    `INSERT INTO users (id, name, email, pin_hash, role) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, body.name.trim(), body.email.toLowerCase().trim(), pin_hash, body.role).run();

  return c.json({ id }, 201);
});

// Update user — superadmin only
userRoutes.patch("/:id", async (c) => {
  if (c.get("role") !== "superadmin") return c.json({ error: "Forbidden" }, 403);

  const { id } = c.req.param();
  const body = await c.req.json<{ name?: string; role?: Role; pin?: string }>();

  const sets: string[] = [];
  const params: string[] = [];

  if (body.name) { sets.push("name = ?"); params.push(body.name.trim()); }
  if (body.role) {
    const allowed: Role[] = ["superadmin", "admin", "member"];
    if (!allowed.includes(body.role)) return c.json({ error: "Invalid role" }, 400);
    sets.push("role = ?"); params.push(body.role);
  }
  if (body.pin) {
    sets.push("pin_hash = ?");
    params.push(await hashPin(body.pin));
  }

  if (!sets.length) return c.json({ error: "Nothing to update" }, 400);
  params.push(id);
  await c.env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return c.json({ ok: true });
});

// Delete user — superadmin only, cannot delete self
userRoutes.delete("/:id", async (c) => {
  if (c.get("role") !== "superadmin") return c.json({ error: "Forbidden" }, 403);
  const { id } = c.req.param();
  if (id === c.get("userId")) return c.json({ error: "Cannot delete yourself" }, 400);
  await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

// Reset own PIN — any authenticated user
userRoutes.post("/reset-pin", async (c) => {
  const body = await c.req.json<{ pin: string }>();
  if (!body.pin || body.pin.length < 4) return c.json({ error: "PIN must be at least 4 characters" }, 400);
  const hash = await hashPin(body.pin);
  await c.env.DB.prepare(`UPDATE users SET pin_hash = ? WHERE id = ?`).bind(hash, c.get("userId")).run();
  return c.json({ ok: true });
});
