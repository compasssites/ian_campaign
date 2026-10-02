# IAN Campaign project

The parent sk_ian/AGENTS.md applies. Actual Git root: this directory. Stack: Astro + React Pages Functions/Hono, D1, KV. Deploy: push main auto-deploys Pages project ian-campaign; migrations applied separately. Build/check: npm run build, server typecheck and tests/auth-security.test.ts. Wrangler: wrangler.toml. D1 DB: ian-campaign-db (f524ab50-ee81-4091-9d34-811f56df165f), migrations src/lib/db/migrations. SESSIONS: existing KV binding. No manual Pages deploy.

Security rollout: plans/2026-10-02-auth-first-pass.md. Keep parent hard limits and owner exceptions; do not read secret files or use browser tools.
