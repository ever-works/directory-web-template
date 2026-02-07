CREATE INDEX "comments_item_id_idx" ON "comments" USING btree ("itemId");--> statement-breakpoint
CREATE INDEX "comments_user_id_idx" ON "comments" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "comments_deleted_at_idx" ON "comments" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "comments_item_deleted_at_idx" ON "comments" USING btree ("itemId","deleted_at");