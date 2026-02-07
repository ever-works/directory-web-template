CREATE TABLE "companies" (
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
CREATE INDEX "companies_name_idx" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "companies_status_idx" ON "companies" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_domain_unique_idx" ON "companies" USING btree (lower("domain")) WHERE "domain" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique_idx" ON "companies" USING btree (lower("slug")) WHERE "slug" IS NOT NULL;