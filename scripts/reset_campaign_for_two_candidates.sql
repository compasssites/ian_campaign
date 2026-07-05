-- Run after deploying the code and applying migrations.
-- This keeps the shared contact/member list intact and removes old campaign progress.
-- Paste into Cloudflare Dashboard > D1 > ian-campaign-db > Console

-- 1. Clear previous calling progress for a fresh election run
DELETE FROM call_logs;

UPDATE contacts
SET
  wa_sent = 0,
  email_sent = 0,
  priority = 0,
  followup_type = NULL;

-- 2. Keep the main superadmin, remove old campaign users, and create the 2 new candidates
DELETE FROM users
WHERE id != 'superadmin-kamal-001';

INSERT OR REPLACE INTO users (id, name, email, username, pin_hash, role)
VALUES
  (
    'member-rahul-kulkarni-001',
    'Dr. Rahul Kulkarni',
    'rahul@ian.local',
    'rahul',
    'f19cc06d6b8e2c58646773db7cc9e2266ce1075ed109f48fb09e6683ebea4d3f',
    'member'
  ),
  (
    'member-pawan-ojha-001',
    'Dr. Pawan Ojha',
    'pawan@ian.local',
    'pawan',
    '1dc650d786c3c689ed7dbb8c30aceb87f32b19dda0d2138b9e147a61e637976d',
    'member'
  );

-- Shared login credentials to give them:
-- Dr. Rahul Kulkarni -> user ID: rahul / password: rahul1234
-- Dr. Pawan Ojha     -> user ID: pawan / password: pawan1234
