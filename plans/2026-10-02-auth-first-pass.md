# IAN Campaign authentication first pass

Actual repository is sk_ian/ian_campaign, Astro Pages project ian-campaign (Git connected), existing D1 and session KV. Login has no limiter; passwords use legacy unsalted SHA-256; KV snapshots keep old roles/deleted users/password-reset sessions. Add atomic account/network burst/hour limits, 8KB credential caps, exact same-origin browser writes and no-store; leave bulk contact payloads unaffected. Salted PBKDF2 at supported 100,000 iterations for new passwords and safe CAS upgrade after successful legacy login. Existing credentials continue working; no new password policy. New KV session keys are hashes, existing sessions remain readable. D1 version/current-role/user checks on APIs and SSR pages, D1 logout revocations, and version increments after admin/own password resets. Extra sign-in after a reset is accepted by owner. No UI redesign or new recovery/enrollment.

- [ ] Synthetic auth/hash/session tests and targeted source checks
- [ ] Apply only additive 0008 prerequisites
- [ ] Push to known Pages Git deployment and bounded live check

Remaining: stronger-password warnings, recovery, session creation/write timing, account aliases, tenant/contact-object permissions, bulk imports/WhatsApp/mail/cost/edge/restore evidence. Current endpoint for own PIN reset keeps its existing contract (no current PIN required); enrollment/user policy changes require review. No owner credential changed.
