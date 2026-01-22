ALTER TABLE "item_location_index" ADD COLUMN "city_normalized" text;--> statement-breakpoint
ALTER TABLE "item_location_index" ADD COLUMN "country_normalized" text;--> statement-breakpoint
CREATE INDEX "item_location_index_city_normalized_idx" ON "item_location_index" USING btree ("city_normalized");--> statement-breakpoint
CREATE INDEX "item_location_index_country_normalized_idx" ON "item_location_index" USING btree ("country_normalized");