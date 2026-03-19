CREATE TABLE "item_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"item_name" text NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"new_status" text,
	"changes" jsonb,
	"performed_by" text,
	"performed_by_name" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_audit_logs" ADD CONSTRAINT "item_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_audit_logs_item_id_idx" ON "item_audit_logs" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_audit_logs_action_idx" ON "item_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "item_audit_logs_performed_by_idx" ON "item_audit_logs" USING btree ("performed_by");--> statement-breakpoint
CREATE INDEX "item_audit_logs_created_at_idx" ON "item_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "item_audit_logs_item_id_action_idx" ON "item_audit_logs" USING btree ("item_id","action");
