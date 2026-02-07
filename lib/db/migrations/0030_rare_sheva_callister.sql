ALTER TABLE "passwordResetTokens" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "verificationTokens" ADD COLUMN "tenant_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "passwordResetTokens" ADD CONSTRAINT "passwordResetTokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verificationTokens" ADD CONSTRAINT "verificationTokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_tenant_idx" ON "passwordResetTokens" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "verification_tokens_tenant_idx" ON "verificationTokens" USING btree ("tenant_id");