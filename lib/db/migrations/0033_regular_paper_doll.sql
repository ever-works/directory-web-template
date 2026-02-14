CREATE TABLE "tenant_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"role_id" text,
	"invited_by" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DROP INDEX "comments_item_id_idx";
--> statement-breakpoint
DROP INDEX "comments_user_id_idx";
--> statement-breakpoint
DROP INDEX "comments_deleted_at_idx";
--> statement-breakpoint
DROP INDEX "comments_item_deleted_at_idx";
--> statement-breakpoint
ALTER TABLE "tenants"
ADD COLUMN "slug" text;
UPDATE "tenants"
SET "slug" = "id";
UPDATE "tenants"
SET "slug" = 'default'
WHERE "id" = 'default-tenant';
ALTER TABLE "tenants"
ALTER COLUMN "slug"
SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tenants"
ADD COLUMN "owner_id" text;
--> statement-breakpoint
ALTER TABLE "tenants"
ADD COLUMN "settings" jsonb;
--> statement-breakpoint
ALTER TABLE "tenant_invitations"
ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_invitations"
ADD CONSTRAINT "tenant_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE
set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tenant_invitations"
ADD CONSTRAINT "tenant_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "invitations_email_tenant_idx" ON "tenant_invitations" USING btree ("email", "tenant_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_unique_idx" ON "tenant_invitations" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "invitations_status_idx" ON "tenant_invitations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "invitations_invited_by_idx" ON "tenant_invitations" USING btree ("invited_by");
--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "tenant_invitations" USING btree ("expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_unique_idx" ON "tenants" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "tenants_owner_idx" ON "tenants" USING btree ("owner_id");