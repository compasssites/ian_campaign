ALTER TABLE contacts ADD COLUMN followup_type TEXT DEFAULT NULL;
-- followup_type: NULL | 'must' | 'maybe'
CREATE INDEX IF NOT EXISTS idx_contacts_followup ON contacts(followup_type);
