CREATE TABLE "seed_status" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"version" text,
	"error" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "seed_status_singleton_idx" ON "seed_status" USING btree ("id");