import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth";
import { contactRoutes } from "./routes/contacts";
import { callRoutes } from "./routes/calls";
import { statsRoutes } from "./routes/stats";
import { userRoutes } from "./routes/users";
import { settingsRoutes } from "./routes/settings";
import { getSession, getTokenFromCookie, type Role } from "../lib/auth/session";

type Bindings = { DB: D1Database; SESSIONS: KVNamespace; CAMPAIGN_PIN: string };
type Variables = { memberName: string; role: Role; userId: string };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("/api/*", cors({ origin: "*", credentials: true }));

app.route("/api/auth", authRoutes);

// Auth guard for all non-auth routes
app.use("/api/*", async (c, next) => {
  const token = getTokenFromCookie(c.req.header("Cookie") ?? null);
  const session = await getSession(c.env.SESSIONS, token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("memberName", session.memberName);
  c.set("role", session.role);
  c.set("userId", session.userId);
  await next();
});

app.route("/api/contacts", contactRoutes);
app.route("/api/calls", callRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/users", userRoutes);
app.route("/api/settings", settingsRoutes);

export { app };
