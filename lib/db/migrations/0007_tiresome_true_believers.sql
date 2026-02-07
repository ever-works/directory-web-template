CREATE TABLE "twenty_crm_config" (
	"id" text PRIMARY KEY NOT NULL,
	"base_url" text NOT NULL,
	"api_key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"sync_mode" text DEFAULT 'disabled' NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "twenty_crm_config_enabled_idx" ON "twenty_crm_config" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "twenty_crm_config_sync_mode_idx" ON "twenty_crm_config" USING btree ("sync_mode");--> statement-breakpoint
CREATE INDEX "twenty_crm_config_updated_at_idx" ON "twenty_crm_config" USING btree ("updated_at");