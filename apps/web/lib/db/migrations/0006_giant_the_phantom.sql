CREATE TABLE "items_companies" (
	"item_slug" text NOT NULL,
	"company_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_companies_item_slug_unique" UNIQUE("item_slug")
);
--> statement-breakpoint
ALTER TABLE "items_companies" ADD CONSTRAINT "items_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_companies_company_id_idx" ON "items_companies" USING btree ("company_id");