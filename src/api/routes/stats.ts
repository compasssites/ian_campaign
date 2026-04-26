import { Hono } from "hono";

type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };

export const statsRoutes = new Hono<{ Bindings: Bindings }>();

statsRoutes.get("/", async (c) => {
  const [totalRow, priorityRow, followupRow, byStatus] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM contacts`).first<{ n: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM contacts WHERE priority = 1`).first<{ n: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as n FROM contacts WHERE followup_type = 'must'`).first<{ n: number }>(),
    c.env.DB.prepare(`
      SELECT COALESCE(cl.status, 'pending') as status, COUNT(*) as n
      FROM contacts c
      LEFT JOIN call_logs cl ON cl.id = (
        SELECT id FROM call_logs WHERE contact_id = c.id ORDER BY called_at DESC LIMIT 1
      )
      GROUP BY COALESCE(cl.status, 'pending')
    `).all<{ status: string; n: number }>(),
  ]);

  const map: Record<string, number> = { pending: 0, spoke: 0, no_answer: 0, wrong_number: 0, callback: 0, followed_up: 0 };
  for (const row of byStatus.results) map[row.status] = row.n;

  return c.json({
    total: totalRow?.n ?? 0,
    priority: priorityRow?.n ?? 0,
    followup_must: followupRow?.n ?? 0,
    ...map,
    called: (map.spoke ?? 0) + (map.no_answer ?? 0) + (map.wrong_number ?? 0) + (map.callback ?? 0) + (map.followed_up ?? 0),
  });
});
