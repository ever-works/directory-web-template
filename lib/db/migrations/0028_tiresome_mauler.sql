ALTER TABLE "client_profiles" ADD COLUMN "default_latitude" double precision;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "default_longitude" double precision;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "default_city" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "default_country" text;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD COLUMN "location_privacy" text DEFAULT 'private';