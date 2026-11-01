ALTER TABLE "chat_sessions" ADD COLUMN "source_schedule_id" uuid;--> statement-breakpoint
UPDATE "chat_sessions" AS sessions
SET "source_schedule_id" = bookings."schedule_id"
FROM "bookings" AS bookings
WHERE sessions."booking_id" = bookings."id" AND sessions."source_schedule_id" IS NULL;--> statement-breakpoint
UPDATE "chat_sessions"
SET "status" = 'closed'
WHERE "source_schedule_id" IS NULL AND "status" IN ('active', 'awaiting_confirmation');--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_source_schedule_id_schedules_id_fk" FOREIGN KEY ("source_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;
