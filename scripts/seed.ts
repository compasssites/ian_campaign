/**
 * Run once after migrations to create the initial superadmin account.
 * Usage: npx wrangler d1 execute ian-campaign-db --remote --command "$(node -e "$(cat scripts/seed-sql.js)")"
 *
 * Easier: run the SQL from scripts/seed.sql via Cloudflare Dashboard > D1 > ian-campaign-db > Console
 */

// SHA-256 of "admin1234" — change BEFORE running in production
// To get a hash for your chosen PIN, open browser console and run:
// crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourPIN'))
//   .then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''))
//   .then(console.log)

console.log("See scripts/seed.sql for the SQL to run in Cloudflare D1 console.");
