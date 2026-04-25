import { Hono } from "hono";
import type { Contact } from "../../lib/db/schema";

import type { Role } from "../../lib/auth/session";
type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };
type Variables = { memberName: string; role: Role; userId: string };

export const contactRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function ulid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

contactRoutes.get("/", async (c) => {
  const { status, group, search, page } = c.req.query();
  const pageNum = parseInt(page ?? "1", 10);
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  let sql = `
    SELECT c.*,
      cl.status, cl.notes, cl.called_at, cl.called_by
    FROM contacts c
    LEFT JOIN call_logs cl ON cl.id = (
      SELECT id FROM call_logs WHERE contact_id = c.id ORDER BY called_at DESC LIMIT 1
    )
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (status && status !== "all") {
    if (status === "pending") {
      sql += ` AND (cl.status IS NULL OR cl.status = 'pending')`;
    } else {
      sql += ` AND cl.status = ?`;
      params.push(status);
    }
  }
  if (group) {
    sql += ` AND c.group_tag = ?`;
    params.push(group);
  }
  if (search) {
    sql += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
  const countResult = await c.env.DB.prepare(countSql).bind(...params).first<{ total: number }>();

  sql += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<Contact>();

  return c.json({
    contacts: results,
    total: countResult?.total ?? 0,
    page: pageNum,
    pages: Math.ceil((countResult?.total ?? 0) / limit),
  });
});

contactRoutes.post("/", async (c) => {
  const body = await c.req.json<Partial<Contact>>();
  if (!body.name || !body.phone) return c.json({ error: "Name and phone required" }, 400);

  const id = ulid();
  await c.env.DB.prepare(
    `INSERT INTO contacts (id, name, phone, email, referred_by, group_tag, shared_interests, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.name.trim(), body.phone.trim(), body.email ?? null, body.referred_by ?? null,
    body.group_tag ?? null, body.shared_interests ?? null, body.remarks ?? null).run();

  return c.json({ id }, 201);
});

contactRoutes.post("/bulk", async (c) => {
  const body = await c.req.json<{ text: string; referred_by?: string; group_tag?: string }>();
  if (!body.text) return c.json({ error: "Text required" }, 400);

  const lines = body.text.split("\n").map((l) => l.trim()).filter(Boolean);
  const inserted: string[] = [];
  const skipped: string[] = [];

  const stmt = c.env.DB.prepare(
    `INSERT INTO contacts (id, name, phone, referred_by, group_tag)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const line of lines) {
    // Support: "Name, Number", "Name Number", "Name, Number, ReferredBy"
    const parts = line.split(/,\s*/).map((p) => p.trim());
    let name: string, phone: string, refBy: string | null;

    if (parts.length >= 2) {
      name = parts[0];
      phone = parts[1].replace(/\D/g, "").slice(-10);
      refBy = parts[2] ?? body.referred_by ?? null;
    } else {
      const spaceIdx = line.search(/\s+\d/);
      if (spaceIdx === -1) { skipped.push(line); continue; }
      name = line.slice(0, spaceIdx).trim();
      phone = line.slice(spaceIdx).replace(/\D/g, "").slice(-10);
      refBy = body.referred_by ?? null;
    }

    if (!name || phone.length < 7) { skipped.push(line); continue; }

    const id = ulid();
    try {
      await stmt.bind(id, name, phone, refBy, body.group_tag ?? null).run();
      inserted.push(id);
    } catch {
      skipped.push(line);
    }
  }

  return c.json({ inserted: inserted.length, skipped: skipped.length });
});

contactRoutes.patch("/:id/toggles", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ wa_sent?: boolean; email_sent?: boolean }>();

  const sets: string[] = [];
  const params: (number | string)[] = [];
  if (body.wa_sent !== undefined) { sets.push("wa_sent = ?"); params.push(body.wa_sent ? 1 : 0); }
  if (body.email_sent !== undefined) { sets.push("email_sent = ?"); params.push(body.email_sent ? 1 : 0); }
  if (!sets.length) return c.json({ error: "Nothing to update" }, 400);

  params.push(id);
  await c.env.DB.prepare(`UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return c.json({ ok: true });
});

contactRoutes.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<Partial<Contact>>();

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  const allowed = ["name", "phone", "email", "referred_by", "group_tag", "shared_interests", "remarks"] as const;
  for (const key of allowed) {
    if (key in body) {
      sets.push(`${key} = ?`);
      params.push((body as Record<string, string | number | null>)[key] ?? null);
    }
  }
  if (!sets.length) return c.json({ error: "Nothing to update" }, 400);
  params.push(id);
  await c.env.DB.prepare(`UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run();
  return c.json({ ok: true });
});

contactRoutes.delete("/:id", async (c) => {
  const { id } = c.req.param();
  await c.env.DB.prepare(`DELETE FROM contacts WHERE id = ?`).bind(id).run();
  return c.json({ ok: true });
});

contactRoutes.get("/groups", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT DISTINCT group_tag FROM contacts WHERE group_tag IS NOT NULL ORDER BY group_tag`
  ).all<{ group_tag: string }>();
  return c.json(results.map((r) => r.group_tag));
});
