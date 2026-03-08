CREATE TABLE IF NOT EXISTS "tenant" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"domain" text,
	"slug" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "activityLogs"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "authenticators"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "client_profiles"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "comments"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "favorites"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "featured_items"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "integration_mappings"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "item_audit_logs"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "item_location_index"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "item_views"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "items_companies"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "location_index_meta"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "moderation_history"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "newsletterSubscriptions"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "notifications"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "passwordResetTokens"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "paymentAccounts"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "paymentProviders"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "permissions"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "role_permissions"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "roles"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "seed_status"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "sponsor_ads"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptionHistory"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "survey_responses"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "surveys"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "twenty_crm_config"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "user_roles"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "verificationTokens"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
ALTER TABLE "votes"
ADD COLUMN IF NOT EXISTS "tenant_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_name_idx" ON "tenant" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tenant_status_idx" ON "tenant" USING btree ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_domain_unique_idx" ON "tenant" USING btree ("domain");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_unique_idx" ON "tenant" USING btree ("slug");
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'accounts_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "accounts"
ADD CONSTRAINT "accounts_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'activityLogs_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "activityLogs"
ADD CONSTRAINT "activityLogs_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'authenticators_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "authenticators"
ADD CONSTRAINT "authenticators_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'client_profiles_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "client_profiles"
ADD CONSTRAINT "client_profiles_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'comments_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "comments"
ADD CONSTRAINT "comments_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'companies_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "companies"
ADD CONSTRAINT "companies_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'favorites_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "favorites"
ADD CONSTRAINT "favorites_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'featured_items_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "featured_items"
ADD CONSTRAINT "featured_items_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'integration_mappings_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "integration_mappings"
ADD CONSTRAINT "integration_mappings_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'item_audit_logs_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "item_audit_logs"
ADD CONSTRAINT "item_audit_logs_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'item_location_index_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "item_location_index"
ADD CONSTRAINT "item_location_index_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'item_views_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "item_views"
ADD CONSTRAINT "item_views_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'items_companies_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "items_companies"
ADD CONSTRAINT "items_companies_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'location_index_meta_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "location_index_meta"
ADD CONSTRAINT "location_index_meta_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'moderation_history_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "moderation_history"
ADD CONSTRAINT "moderation_history_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'newsletterSubscriptions_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "newsletterSubscriptions"
ADD CONSTRAINT "newsletterSubscriptions_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'notifications_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'passwordResetTokens_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "passwordResetTokens"
ADD CONSTRAINT "passwordResetTokens_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'paymentAccounts_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "paymentAccounts"
ADD CONSTRAINT "paymentAccounts_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'paymentProviders_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "paymentProviders"
ADD CONSTRAINT "paymentProviders_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'permissions_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "permissions"
ADD CONSTRAINT "permissions_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'role_permissions_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'roles_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "roles"
ADD CONSTRAINT "roles_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'seed_status_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "seed_status"
ADD CONSTRAINT "seed_status_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'sponsor_ads_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "sponsor_ads"
ADD CONSTRAINT "sponsor_ads_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'subscriptionHistory_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "subscriptionHistory"
ADD CONSTRAINT "subscriptionHistory_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'subscriptions_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "subscriptions"
ADD CONSTRAINT "subscriptions_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'survey_responses_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "survey_responses"
ADD CONSTRAINT "survey_responses_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'surveys_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "surveys"
ADD CONSTRAINT "surveys_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'twenty_crm_config_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "twenty_crm_config"
ADD CONSTRAINT "twenty_crm_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'user_roles_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'users_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "users"
ADD CONSTRAINT "users_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'verificationTokens_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "verificationTokens"
ADD CONSTRAINT "verificationTokens_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'votes_tenant_id_tenant_id_fk'
) THEN
ALTER TABLE "votes"
ADD CONSTRAINT "votes_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
END IF;
END $$;