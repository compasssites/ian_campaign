import { Hono } from "hono";
import type { Role } from "../../lib/auth/session";

type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };
type Variables = { memberName: string; role: Role; userId: string };

export const settingsRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

settingsRoutes.get("/wa-templates", async (c) => {
  const row = await c.env.DB.prepare(`SELECT value FROM settings WHERE key = 'wa_templates'`)
    .first<{ value: string }>();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(JSON.parse(row.value));
});

settingsRoutes.put("/wa-templates", async (c) => {
  const role = c.get("role");
  if (role !== "superadmin" && role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ noPickup: string; spoke: string }>();
  if (!body.noPickup || !body.spoke) return c.json({ error: "Both templates required" }, 400);

  await c.env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('wa_templates', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(JSON.stringify(body)).run();

  return c.json({ ok: true });
});
