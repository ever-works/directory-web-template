CREATE TABLE "user_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_no_self_follow" CHECK ("user_follows"."follower_id" <> "user_follows"."following_id")
);
--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_follows_unique_idx" ON "user_follows" USING btree ("follower_id","following_id","tenant_id");--> statement-breakpoint
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows" USING btree ("follower_id");--> statement-breakpoint
CREATE INDEX "user_follows_following_id_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "user_follows_tenant_id_idx" ON "user_follows" USING btree ("tenant_id");