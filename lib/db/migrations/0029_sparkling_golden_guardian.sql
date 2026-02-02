CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_profiles" DROP CONSTRAINT "client_profiles_username_unique";--> statement-breakpoint
ALTER TABLE "newsletterSubscriptions" DROP CONSTRAINT "newsletterSubscriptions_email_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "surveys" DROP CONSTRAINT "surveys_slug_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
DROP INDEX "surveys_slug_idx";--> statement-breakpoint
DROP INDEX "client_profile_username_idx";--> statement-breakpoint
DROP INDEX "companies_domain_unique_idx";--> statement-breakpoint
DROP INDEX "companies_slug_unique_idx";--> statement-breakpoint
DROP INDEX "integration_mappings_ever_id_object_type_idx";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "activityLogs" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "favorites" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "featured_items" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_mappings" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "item_audit_logs" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "item_location_index" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "item_views" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "items_companies" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletterSubscriptions" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "paymentAccounts" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sponsor_ads" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptionHistory" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "twenty_crm_config" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "votes" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "tenants_created_at_idx" ON "tenants" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activityLogs" ADD CONSTRAINT "activityLogs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_items" ADD CONSTRAINT "featured_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_mappings" ADD CONSTRAINT "integration_mappings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_audit_logs" ADD CONSTRAINT "item_audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_location_index" ADD CONSTRAINT "item_location_index_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_views" ADD CONSTRAINT "item_views_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items_companies" ADD CONSTRAINT "items_companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_history" ADD CONSTRAINT "moderation_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletterSubscriptions" ADD CONSTRAINT "newsletterSubscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paymentAccounts" ADD CONSTRAINT "paymentAccounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsor_ads" ADD CONSTRAINT "sponsor_ads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptionHistory" ADD CONSTRAINT "subscriptionHistory_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twenty_crm_config" ADD CONSTRAINT "twenty_crm_config_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_tenant_idx" ON "accounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activity_logs_tenant_idx" ON "activityLogs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_profile_tenant_idx" ON "client_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "comments_tenant_idx" ON "comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "companies_tenant_idx" ON "companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "favorites_tenant_idx" ON "favorites" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "featured_items_tenant_idx" ON "featured_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "integration_mappings_tenant_idx" ON "integration_mappings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "item_audit_logs_tenant_idx" ON "item_audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "item_location_index_tenant_idx" ON "item_location_index" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "item_views_tenant_idx" ON "item_views" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "items_companies_tenant_idx" ON "items_companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "moderation_history_tenant_idx" ON "moderation_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_tenant_unique_idx" ON "newsletterSubscriptions" USING btree ("email","tenant_id");--> statement-breakpoint
CREATE INDEX "newsletter_tenant_idx" ON "newsletterSubscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_tenant_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_account_tenant_idx" ON "paymentAccounts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reports_tenant_idx" ON "reports" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "role_permissions_tenant_idx" ON "role_permissions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "roles_tenant_idx" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_tenant_unique_idx" ON "roles" USING btree ("name","tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_tenant_idx" ON "sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sponsor_ads_tenant_idx" ON "sponsor_ads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscription_history_tenant_idx" ON "subscriptionHistory" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscription_tenant_idx" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "survey_responses_tenant_idx" ON "survey_responses" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "surveys_slug_unique_idx" ON "surveys" USING btree ("slug","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "twenty_crm_config_tenant_idx" ON "twenty_crm_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_roles_tenant_idx" ON "user_roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_tenant_unique_idx" ON "users" USING btree ("email","tenant_id");--> statement-breakpoint
CREATE INDEX "votes_tenant_idx" ON "votes" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_profile_username_idx" ON "client_profiles" USING btree ("username","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_domain_unique_idx" ON "companies" USING btree ("domain","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique_idx" ON "companies" USING btree ("slug","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_mappings_ever_id_object_type_idx" ON "integration_mappings" USING btree ("ever_id","object_type","tenant_id");