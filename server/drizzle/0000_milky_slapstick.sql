CREATE TYPE "public"."booking_status" AS ENUM('booked', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."coach_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."package_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."reschedule_status" AS ENUM('pending', 'held', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('available', 'full', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'held', 'active', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'customer');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'booked' NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(32),
	"specialty" varchar(120),
	"bio" text,
	"status" "coach_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_number" varchar(32) NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(32),
	"emergency_contact" text,
	"weight" numeric(6, 2),
	"height" numeric(6, 2),
	"blood_type" varchar(8),
	"medical_history" text,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_weight_nonnegative_chk" CHECK ("members"."weight" >= 0),
	CONSTRAINT "members_height_nonnegative_chk" CHECK ("members"."height" >= 0)
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" varchar(80) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"total_sessions" integer NOT NULL,
	"validity_days" integer NOT NULL,
	"status" "package_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_price_nonnegative_chk" CHECK ("packages"."price" >= 0),
	CONSTRAINT "packages_sessions_positive_chk" CHECK ("packages"."total_sessions" > 0),
	CONSTRAINT "packages_validity_positive_chk" CHECK ("packages"."validity_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"subscription_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"method" varchar(64) NOT NULL,
	"reference" varchar(255),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_nonnegative_chk" CHECK ("payments"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reschedule_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"from_schedule_id" uuid NOT NULL,
	"to_schedule_id" uuid NOT NULL,
	"customer_message" text,
	"admin_note" text,
	"status" "reschedule_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reschedule_requests_different_schedule_chk" CHECK ("reschedule_requests"."from_schedule_id" <> "reschedule_requests"."to_schedule_id")
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(160) NOT NULL,
	"coach_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"status" "schedule_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedules_capacity_positive_chk" CHECK ("schedules"."capacity" > 0),
	CONSTRAINT "schedules_end_after_start_chk" CHECK ("schedules"."ends_at" > "schedules"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"total_sessions" integer NOT NULL,
	"used_sessions" integer DEFAULT 0 NOT NULL,
	"amount_paid" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_total_sessions_nonnegative_chk" CHECK ("subscriptions"."total_sessions" >= 0),
	CONSTRAINT "subscriptions_used_sessions_nonnegative_chk" CHECK ("subscriptions"."used_sessions" >= 0),
	CONSTRAINT "subscriptions_used_sessions_lte_total_chk" CHECK ("subscriptions"."used_sessions" <= "subscriptions"."total_sessions"),
	CONSTRAINT "subscriptions_amount_paid_nonnegative_chk" CHECK ("subscriptions"."amount_paid" >= 0),
	CONSTRAINT "subscriptions_expiry_after_start_chk" CHECK ("subscriptions"."expires_at" > "subscriptions"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_services" ADD CONSTRAINT "coach_services_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_services" ADD CONSTRAINT "coach_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_from_schedule_id_schedules_id_fk" FOREIGN KEY ("from_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_to_schedule_id_schedules_id_fk" FOREIGN KEY ("to_schedule_id") REFERENCES "public"."schedules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_member_schedule_active_uidx" ON "bookings" USING btree ("member_id","schedule_id") WHERE "bookings"."status" = 'booked';--> statement-breakpoint
CREATE INDEX "bookings_schedule_status_idx" ON "bookings" USING btree ("schedule_id","status");--> statement-breakpoint
CREATE INDEX "bookings_member_idx" ON "bookings" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_services_coach_service_uidx" ON "coach_services" USING btree ("coach_id","service_id");--> statement-breakpoint
CREATE INDEX "coach_services_service_idx" ON "coach_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "coaches_status_idx" ON "coaches" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "members_member_number_uidx" ON "members" USING btree ("member_number");--> statement-breakpoint
CREATE UNIQUE INDEX "members_user_uidx" ON "members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_member_idx" ON "payments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reference_uidx" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_hash_uidx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reschedule_requests_booking_idx" ON "reschedule_requests" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "reschedule_requests_status_idx" ON "reschedule_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedules_coach_start_idx" ON "schedules" USING btree ("coach_id","starts_at");--> statement-breakpoint
CREATE INDEX "schedules_service_start_idx" ON "schedules" USING btree ("service_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "services_name_uidx" ON "services" USING btree ("name");--> statement-breakpoint
CREATE INDEX "subscriptions_member_idx" ON "subscriptions" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");