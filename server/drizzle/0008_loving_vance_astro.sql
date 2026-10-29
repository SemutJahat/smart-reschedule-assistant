CREATE TYPE "public"."chat_analysis_next_state" AS ENUM('active', 'awaiting_confirmation', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."chat_analysis_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."chat_intent" AS ENUM('Reschedule', 'Cancel', 'Schedule inquiry', 'Confirmation', 'Other');--> statement-breakpoint
CREATE TYPE "public"."chat_message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."chat_session_status" AS ENUM('active', 'awaiting_confirmation', 'submitted', 'closed');--> statement-breakpoint
CREATE TABLE "chat_message_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"status" "chat_analysis_status" DEFAULT 'pending' NOT NULL,
	"intent" "chat_intent" NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"extracted_data" jsonb NOT NULL,
	"recommended_schedule_ids" jsonb NOT NULL,
	"next_state" "chat_analysis_next_state" NOT NULL,
	"reply" text NOT NULL,
	"model" varchar(120) NOT NULL,
	"model_version" varchar(120) NOT NULL,
	"error_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_message_analyses_confidence_chk" CHECK ("chat_message_analyses"."confidence" >= 0 and "chat_message_analyses"."confidence" <= 1)
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text NOT NULL,
	"sequence" integer NOT NULL,
	"client_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"status" "chat_session_status" DEFAULT 'active' NOT NULL,
	"current_intent" "chat_intent",
	"proposed_schedule_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD COLUMN "chat_session_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_message_analyses" ADD CONSTRAINT "chat_message_analyses_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_proposed_schedule_id_schedules_id_fk" FOREIGN KEY ("proposed_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_analyses_message_uidx" ON "chat_message_analyses" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "chat_message_analyses_status_idx" ON "chat_message_analyses" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_sequence_uidx" ON "chat_messages" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_session_client_message_uidx" ON "chat_messages" USING btree ("session_id","client_message_id") WHERE "chat_messages"."client_message_id" is not null;--> statement-breakpoint
CREATE INDEX "chat_sessions_member_idx" ON "chat_sessions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_booking_idx" ON "chat_sessions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_status_idx" ON "chat_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_sessions_active_member_booking_uidx" ON "chat_sessions" USING btree ("member_id","booking_id") WHERE "chat_sessions"."status" in ('active', 'awaiting_confirmation');--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;