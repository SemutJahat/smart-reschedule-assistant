-- Reconcile the original 0000 schema with the approved production shape.
ALTER TYPE "user_role" RENAME TO "user_role_old";
CREATE TYPE "user_role" AS ENUM ('admin', 'customer');
UPDATE "users" SET "role" = 'customer' WHERE "role" = 'coach';
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING "role"::text::"user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';
DROP TYPE "user_role_old";

ALTER TABLE "users" ADD COLUMN "name" varchar(200);
UPDATE "users" SET "name" = trim(concat_ws(' ', "first_name", "last_name"));
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
UPDATE "users" SET "email" = lower(trim("email"));
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "users" GROUP BY lower("email") HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot reconcile users: duplicate case-insensitive email exists';
  END IF;
END $$;
DROP INDEX IF EXISTS "users_email_uidx";
CREATE UNIQUE INDEX "users_email_lower_uidx" ON "users" USING btree (lower("email"));
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_chk" CHECK ("email" = lower("email"));

ALTER TABLE "members" ADD COLUMN "member_number" varchar(32);
UPDATE "members" SET "member_number" = 'LEGACY-' || substr("id"::text, 1, 8) WHERE "member_number" IS NULL;
ALTER TABLE "members" ALTER COLUMN "member_number" SET NOT NULL;
ALTER TABLE "members" ADD COLUMN "emergency_contact" text;
ALTER TABLE "members" ADD COLUMN "weight" numeric(6, 2);
ALTER TABLE "members" ADD COLUMN "height" numeric(6, 2);
ALTER TABLE "members" ADD COLUMN "blood_type" varchar(8);
ALTER TABLE "members" ADD COLUMN "medical_history" text;
CREATE UNIQUE INDEX "members_member_number_uidx" ON "members" USING btree ("member_number");
ALTER TABLE "members" ADD CONSTRAINT "members_weight_nonnegative_chk" CHECK ("weight" >= 0);
ALTER TABLE "members" ADD CONSTRAINT "members_height_nonnegative_chk" CHECK ("height" >= 0);

ALTER TABLE "coaches" ADD COLUMN "name" varchar(200);
UPDATE "coaches" c SET "name" = coalesce(nullif(trim(concat_ws(' ', u."first_name", u."last_name")), ''), 'Legacy Coach')
FROM "users" u WHERE u."id" = c."user_id";
ALTER TABLE "coaches" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "coaches" ADD COLUMN "phone" varchar(32);
ALTER TABLE "coaches" ADD COLUMN "specialty" varchar(120);
ALTER TABLE "coaches" DROP CONSTRAINT IF EXISTS "coaches_user_id_users_id_fk";
DROP INDEX IF EXISTS "coaches_user_uidx";
ALTER TABLE "coaches" DROP COLUMN "user_id";
CREATE INDEX "coaches_status_idx" ON "coaches" USING btree ("status");
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
ALTER TABLE "packages" ADD COLUMN "category" varchar(80);
UPDATE "packages" SET "category" = 'general' WHERE "category" IS NULL;
ALTER TABLE "packages" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "schedules" ADD COLUMN "title" varchar(160);
UPDATE "schedules" SET "title" = 'Schedule ' || substr("id"::text, 1, 8) WHERE "title" IS NULL;
ALTER TABLE "schedules" ALTER COLUMN "title" SET NOT NULL;

ALTER TYPE "subscription_status" ADD VALUE IF NOT EXISTS 'held';
ALTER TYPE "reschedule_status" ADD VALUE IF NOT EXISTS 'held';
ALTER TYPE "schedule_status" RENAME VALUE 'scheduled' TO 'available';
ALTER TYPE "schedule_status" RENAME VALUE 'completed' TO 'full';
ALTER TYPE "booking_status" RENAME TO "booking_status_old";
CREATE TYPE "booking_status" AS ENUM ('booked', 'cancelled', 'attended', 'no_show');
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "booking_status" USING CASE "status"::text WHEN 'pending' THEN 'booked' WHEN 'confirmed' THEN 'booked' WHEN 'completed' THEN 'attended' ELSE "status"::text END::"booking_status";
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'booked';
DROP TYPE "booking_status_old";

ALTER TABLE "payments" ALTER COLUMN "subscription_id" DROP NOT NULL;
ALTER TABLE "payments" ADD COLUMN "method" varchar(64);
ALTER TABLE "payments" ADD COLUMN "reference" varchar(255);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "payments" WHERE "provider_reference" IS NOT NULL GROUP BY coalesce("provider", 'legacy'), "provider_reference" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot reconcile payments: duplicate provider references exist';
  END IF;
END $$;
UPDATE "payments" SET "method" = coalesce("provider", 'legacy'), "reference" = CASE WHEN "provider_reference" IS NULL THEN NULL ELSE coalesce("provider", 'legacy') || ':' || "provider_reference" END
WHERE "method" IS NULL;
DROP INDEX IF EXISTS "payments_provider_reference_uidx";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "provider_reference";
CREATE UNIQUE INDEX "payments_reference_uidx" ON "payments" USING btree ("reference");

CREATE UNIQUE INDEX "subscriptions_member_id_uidx" ON "subscriptions" USING btree ("member_id", "id");
CREATE UNIQUE INDEX "bookings_id_member_schedule_uidx" ON "bookings" USING btree ("id", "member_id", "schedule_id");
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "bookings" b
    LEFT JOIN "subscriptions" s ON s."id" = b."subscription_id" AND s."member_id" = b."member_id"
    WHERE s."id" IS NULL
  ) THEN RAISE EXCEPTION 'Cannot reconcile bookings: member and subscription do not match'; END IF;
END $$;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_subscription_fk"
  FOREIGN KEY ("member_id", "subscription_id") REFERENCES "subscriptions" ("member_id", "id");
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "payments" p
    WHERE p."subscription_id" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "subscriptions" s WHERE s."id" = p."subscription_id" AND s."member_id" = p."member_id")
  ) THEN RAISE EXCEPTION 'Cannot reconcile payments: member and subscription do not match'; END IF;
END $$;
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_subscription_fk"
  FOREIGN KEY ("member_id", "subscription_id") REFERENCES "subscriptions" ("member_id", "id");
INSERT INTO "coach_services" ("coach_id", "service_id")
SELECT DISTINCT "coach_id", "service_id" FROM "schedules"
ON CONFLICT ("coach_id", "service_id") DO NOTHING;
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_coach_service_fk"
  FOREIGN KEY ("coach_id", "service_id") REFERENCES "coach_services" ("coach_id", "service_id");

ALTER TABLE "reschedule_requests" DROP CONSTRAINT IF EXISTS "reschedule_requests_requested_by_users_id_fk";
ALTER TABLE "reschedule_requests" RENAME COLUMN "requested_by" TO "member_id";
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "reschedule_requests" r LEFT JOIN "members" m ON m."user_id" = r."member_id" WHERE m."id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot reconcile reschedule requests: requested user is not a member';
  END IF;
END $$;
UPDATE "reschedule_requests" r SET "member_id" = m."id" FROM "members" m WHERE m."user_id" = r."member_id";
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_member_id_members_id_fk"
  FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE restrict;
ALTER TABLE "reschedule_requests" RENAME COLUMN "reason" TO "customer_message";
ALTER TABLE "reschedule_requests" ADD COLUMN "admin_note" text;
ALTER TABLE "reschedule_requests" ADD COLUMN "reviewed_by" uuid;
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_reviewed_by_users_id_fk"
  FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id") ON DELETE set null;
ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_booking_member_from_schedule_fk"
  FOREIGN KEY ("booking_id", "member_id", "from_schedule_id")
  REFERENCES "bookings" ("id", "member_id", "schedule_id");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "reschedule_requests" WHERE "status" = 'pending' GROUP BY "booking_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot reconcile reschedule requests: multiple pending requests exist for a booking';
  END IF;
END $$;
CREATE UNIQUE INDEX "reschedule_requests_active_booking_uidx" ON "reschedule_requests" USING btree ("booking_id")
  WHERE "status" IN ('pending', 'held');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW."updated_at" = now(); RETURN NEW; END;
$$;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','members','refresh_tokens','coaches','coach_services','services','packages','subscriptions','schedules','bookings','reschedule_requests','payments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END LOOP;
END $$;
