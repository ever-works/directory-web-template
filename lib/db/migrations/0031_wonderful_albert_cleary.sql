ALTER TABLE "paymentProviders" DROP CONSTRAINT "paymentProviders_name_unique";--> statement-breakpoint
ALTER TABLE "permissions" DROP CONSTRAINT "permissions_key_unique";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "activityLogs" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "client_profiles" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "favorites" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "featured_items" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "integration_mappings" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "item_audit_logs" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "item_location_index" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "item_views" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "items_companies" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "moderation_history" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "newsletterSubscriptions" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "passwordResetTokens" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "paymentAccounts" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "roles" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "sponsor_ads" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "subscriptionHistory" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "survey_responses" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "surveys" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "twenty_crm_config" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "verificationTokens" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "tenant_id" SET DEFAULT 'default-tenant';--> statement-breakpoint
ALTER TABLE "authenticators" ADD COLUMN "tenant_id" text DEFAULT 'default-tenant' NOT NULL;--> statement-breakpoint
ALTER TABLE "paymentProviders" ADD COLUMN "tenant_id" text DEFAULT 'default-tenant' NOT NULL;--> statement-breakpoint
ALTER TABLE "permissions" ADD COLUMN "tenant_id" text DEFAULT 'default-tenant' NOT NULL;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paymentProviders" ADD CONSTRAINT "paymentProviders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_tenant_name_idx" ON "paymentProviders" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_tenant_key_idx" ON "permissions" USING btree ("tenant_id","key");