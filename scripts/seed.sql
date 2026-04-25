-- Run this in Cloudflare Dashboard > D1 > ian-campaign-db > Console
-- after deploying, to create the first superadmin.
--
-- PIN below is "ian2025" — SHA-256 hash
-- Change the hash for a different PIN using browser console:
--   crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourPIN'))
--     .then(b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''))
--     .then(console.log)

INSERT OR REPLACE INTO users (id, name, email, pin_hash, role)
VALUES (
  'superadmin-kamal-001',
  'Kamal',
  'mywebsite@mycompass.in',
  -- SHA-256 of "ian2025" — change this PIN after first login via Change PIN
  'c9527a9acd82f4b1702d5de22a1940e6dbf1b183cf299e6e61a30aca61456491',
  'superadmin'
);

-- Add the boss as admin — update email and name as needed
-- INSERT OR REPLACE INTO users (id, name, email, pin_hash, role)
-- VALUES (
--   'admin-boss-001',
--   'Dr. Boss Name',
--   'boss@example.com',
--   'HASH_HERE',
--   'admin'
-- );
