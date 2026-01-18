CREATE TABLE "item_location_index" (
	"item_slug" text PRIMARY KEY NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"service_area" text,
	"is_remote" boolean DEFAULT false NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "item_location_index_latitude_idx" ON "item_location_index" USING btree ("latitude");--> statement-breakpoint
CREATE INDEX "item_location_index_longitude_idx" ON "item_location_index" USING btree ("longitude");--> statement-breakpoint
CREATE INDEX "item_location_index_city_idx" ON "item_location_index" USING btree ("city");--> statement-breakpoint
CREATE INDEX "item_location_index_country_idx" ON "item_location_index" USING btree ("country");--> statement-breakpoint
CREATE INDEX "item_location_index_is_remote_idx" ON "item_location_index" USING btree ("is_remote");--> statement-breakpoint
CREATE INDEX "item_location_index_indexed_at_idx" ON "item_location_index" USING btree ("indexed_at");--> statement-breakpoint
CREATE INDEX "item_location_index_lat_long_idx" ON "item_location_index" USING btree ("latitude","longitude");