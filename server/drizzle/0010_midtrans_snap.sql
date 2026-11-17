ALTER TABLE "payments" ADD COLUMN "snap_token" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "snap_redirect_url" varchar(512);