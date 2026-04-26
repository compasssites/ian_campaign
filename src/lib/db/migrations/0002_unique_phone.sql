-- Prevent duplicate phone numbers going forward
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone_unique ON contacts(phone) WHERE phone != '';
