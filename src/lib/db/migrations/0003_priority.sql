ALTER TABLE contacts ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contacts_priority ON contacts(priority);
