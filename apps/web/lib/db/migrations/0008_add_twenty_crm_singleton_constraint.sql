-- Add singleton constraint to ensure only one Twenty CRM config can exist
-- This prevents accidental insertion of multiple configurations
CREATE UNIQUE INDEX IF NOT EXISTS "twenty_crm_config_singleton_idx" ON "twenty_crm_config" ((true));
