import { Hono } from "hono";
import type { ContactStatus } from "../../lib/db/schema";

import type { Role } from "../../lib/auth/session";
type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };
type Variables = { memberName: string; role: Role; userId: string };

export const callRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function ulid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

callRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    contact_id: string;
    status: ContactStatus;
    notes?: string;
  }>();

  if (!body.contact_id || !body.status) {
    return c.json({ error: "contact_id and status required" }, 400);
  }

  const validStatuses: ContactStatus[] = ["pending", "spoke", "no_answer", "wrong_number", "callback", "followed_up"];
  if (!validStatuses.includes(body.status)) {
    return c.json({ error: "Invalid status" }, 400);
  }

  const memberName = c.get("memberName");
  const id = ulid();

  const userId = c.get("userId");
  await c.env.DB.prepare(
    `INSERT INTO call_logs (id, contact_id, called_by, called_by_user_id, status, notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, body.contact_id, memberName ?? null, userId ?? null, body.status, body.notes ?? null).run();

  return c.json({ id }, 201);
});

callRoutes.get("/:contactId", async (c) => {
  const { contactId } = c.req.param();
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM call_logs WHERE contact_id = ? ORDER BY called_at DESC LIMIT 20`
  ).bind(contactId).all();
  return c.json(results);
});
