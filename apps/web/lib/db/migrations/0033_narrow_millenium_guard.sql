CREATE TABLE "portfolio_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"client_profile_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text NOT NULL,
	"external_url" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_featured" boolean DEFAULT false,
	"position" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "interests" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "skills" jsonb;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_client_profile_id_client_profiles_id_fk" FOREIGN KEY ("client_profile_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_projects_client_profile_id_idx" ON "portfolio_projects" USING btree ("client_profile_id");--> statement-breakpoint
CREATE INDEX "portfolio_projects_tenant_id_idx" ON "portfolio_projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "portfolio_projects_is_featured_idx" ON "portfolio_projects" USING btree ("is_featured");