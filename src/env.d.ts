/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    session?: import("./lib/auth/session").Session;
  }
}

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CAMPAIGN_PIN: string;
}
