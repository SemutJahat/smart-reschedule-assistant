ALTER TABLE "chat_sessions" ADD COLUMN "source_schedule_id" uuid;
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_source_schedule_id_schedules_id_fk" FOREIGN KEY ("source_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;
