-- Add country and currency fields to client_profiles table
-- These fields enable automatic currency detection based on user location

-- Drop constraint if exists before recreating it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'auto_renewal_check' AND table_name = 'subscriptions') THEN
        ALTER TABLE "subscriptions" DROP CONSTRAINT "auto_renewal_check";
    END IF;
END $$;
--> statement-breakpoint

-- Add country column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_profiles' AND column_name = 'country') THEN
        ALTER TABLE "client_profiles" ADD COLUMN "country" text;
    END IF;
END $$;
--> statement-breakpoint

-- Add currency column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_profiles' AND column_name = 'currency') THEN
        ALTER TABLE "client_profiles" ADD COLUMN "currency" text DEFAULT 'USD';
    END IF;
END $$;
--> statement-breakpoint

-- Recreate constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'auto_renewal_check' AND table_name = 'subscriptions') THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "auto_renewal_check" CHECK (NOT ("subscriptions"."auto_renewal" AND "subscriptions"."cancel_at_period_end"));
    END IF;
END $$;
--> statement-breakpoint

-- Add index on country for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS "client_profile_country_idx" ON "client_profiles" ("country");
--> statement-breakpoint

-- Add index on currency for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS "client_profile_currency_idx" ON "client_profiles" ("currency");