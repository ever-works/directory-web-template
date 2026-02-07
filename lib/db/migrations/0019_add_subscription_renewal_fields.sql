-- Add subscription auto-renewal management fields to subscriptions table
-- Adds: auto_renewal, renewal_reminder_sent, last_renewal_attempt, failed_payment_count

-- Add auto_renewal column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'auto_renewal') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "auto_renewal" boolean DEFAULT true;
    END IF;
END $$;
--> statement-breakpoint

-- Add renewal_reminder_sent column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'renewal_reminder_sent') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "renewal_reminder_sent" boolean DEFAULT false;
    END IF;
END $$;
--> statement-breakpoint

-- Add last_renewal_attempt column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'last_renewal_attempt') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "last_renewal_attempt" timestamp with time zone;
    END IF;
END $$;
--> statement-breakpoint

-- Add failed_payment_count column (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'failed_payment_count') THEN
        ALTER TABLE "subscriptions" ADD COLUMN "failed_payment_count" integer DEFAULT 0;
    END IF;
END $$;
