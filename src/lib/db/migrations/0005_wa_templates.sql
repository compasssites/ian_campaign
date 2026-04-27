CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES (
  'wa_templates',
  '{"noPickup":"Dear Dr. {{FIRSTNAME}},\n\nThis is Dr. Sudhir Kothari from Poona. I tried calling you but couldn''t get through. This is regarding the upcoming IAN election. Please let me know when I can call, or give me a call when you are free.","spoke":"Dear Dr. {{FIRSTNAME}},\n\nIt was a pleasure speaking with you. Voting starts on 6 May and ends on 10 May. Thank you for your support."}'
);
