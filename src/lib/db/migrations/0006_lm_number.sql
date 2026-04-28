ALTER TABLE contacts ADD COLUMN lm_number TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_lm ON contacts(lm_number);
