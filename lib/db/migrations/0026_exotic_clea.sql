CREATE TABLE "location_index_meta" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"last_rebuild_at" timestamp with time zone,
	"last_rebuild_duration_ms" integer,
	"last_rebuild_item_count" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "location_index_meta_singleton_idx" ON "location_index_meta" USING btree ("id");