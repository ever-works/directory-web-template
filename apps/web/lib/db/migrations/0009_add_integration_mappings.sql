-- Add integration_mappings table for storing Ever ID ↔ CRM ID mappings
-- This enables persistent storage of sync mappings across restarts and instances

CREATE TABLE "integration_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"ever_id" text NOT NULL,
	"crm_id" text NOT NULL,
	"object_type" text NOT NULL,
	"last_synced_at" timestamptz NOT NULL DEFAULT now(),
	"version_hash" text,
	"created_at" timestamptz NOT NULL DEFAULT now(),
	"updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_mappings_ever_id_object_type_idx" ON "integration_mappings" ("ever_id", "object_type");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_mappings_crm_id_object_type_uidx" ON "integration_mappings" ("crm_id", "object_type");--> statement-breakpoint
CREATE INDEX "integration_mappings_crm_id_idx" ON "integration_mappings" USING btree ("crm_id");--> statement-breakpoint
CREATE INDEX "integration_mappings_last_synced_at_idx" ON "integration_mappings" USING btree ("last_synced_at");--> statement-breakpoint
CREATE INDEX "integration_mappings_object_type_idx" ON "integration_mappings" USING btree ("object_type");
