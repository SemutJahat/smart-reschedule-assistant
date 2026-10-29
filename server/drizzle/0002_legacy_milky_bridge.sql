-- Bridge databases that were initialized by the historical
-- `0000_milky_slapstick` migration. Every operation below is safe when the
-- current 0000 + 0001 path has already produced the final schema.

DROP INDEX IF EXISTS "users_email_uidx";
--> statement-breakpoint
UPDATE "users" SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_uidx"
  ON "users" USING btree (lower("email"));
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_lowercase_chk'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_email_lowercase_chk"
      CHECK ("email" = lower("email"));
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "payments" ALTER COLUMN "method" DROP NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_member_id_uidx"
  ON "subscriptions" USING btree ("member_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_id_member_schedule_uidx"
  ON "bookings" USING btree ("id", "member_id", "schedule_id");
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_member_subscription_fk'
      AND conrelid = 'bookings'::regclass
  ) THEN
    ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_subscription_fk"
      FOREIGN KEY ("member_id", "subscription_id")
      REFERENCES "subscriptions" ("member_id", "id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_member_subscription_fk'
      AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_member_subscription_fk"
      FOREIGN KEY ("member_id", "subscription_id")
      REFERENCES "subscriptions" ("member_id", "id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reschedule_requests_booking_member_from_schedule_fk'
      AND conrelid = 'reschedule_requests'::regclass
  ) THEN
    ALTER TABLE "reschedule_requests"
      ADD CONSTRAINT "reschedule_requests_booking_member_from_schedule_fk"
      FOREIGN KEY ("booking_id", "member_id", "from_schedule_id")
      REFERENCES "bookings" ("id", "member_id", "schedule_id");
  END IF;
END $$;
--> statement-breakpoint

INSERT INTO "coach_services" ("coach_id", "service_id")
SELECT DISTINCT "coach_id", "service_id" FROM "schedules"
ON CONFLICT ("coach_id", "service_id") DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'schedules_coach_service_fk'
      AND conrelid = 'schedules'::regclass
  ) THEN
    ALTER TABLE "schedules" ADD CONSTRAINT "schedules_coach_service_fk"
      FOREIGN KEY ("coach_id", "service_id")
      REFERENCES "coach_services" ("coach_id", "service_id");
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reschedule_requests_active_booking_uidx"
  ON "reschedule_requests" USING btree ("booking_id")
  WHERE "status" IN ('pending', 'held');
--> statement-breakpoint

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'members', 'refresh_tokens', 'coaches', 'coach_services',
    'services', 'packages', 'subscriptions', 'schedules', 'bookings',
    'reschedule_requests', 'payments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name, table_name
    );
  END LOOP;
END $$;
