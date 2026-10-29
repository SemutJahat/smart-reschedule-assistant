ALTER TABLE "reschedule_requests" DROP CONSTRAINT "reschedule_requests_booking_member_from_schedule_fk";
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reschedule_requests_booking_id_bookings_id_fk' AND conrelid = 'reschedule_requests'::regclass) THEN
    ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE cascade ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reschedule_requests_member_id_members_id_fk' AND conrelid = 'reschedule_requests'::regclass) THEN
    ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE restrict ON UPDATE no action;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reschedule_requests_from_schedule_id_schedules_id_fk' AND conrelid = 'reschedule_requests'::regclass) THEN
    ALTER TABLE "reschedule_requests" ADD CONSTRAINT "reschedule_requests_from_schedule_id_schedules_id_fk" FOREIGN KEY ("from_schedule_id") REFERENCES "schedules" ("id") ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bookings_invariant_trigger ON bookings;
DROP FUNCTION IF EXISTS enforce_booking_invariants();
DROP TRIGGER IF EXISTS bookings_capacity_trigger ON bookings;
DROP FUNCTION IF EXISTS enforce_booking_capacity();
DROP TRIGGER IF EXISTS bookings_lock_trigger ON bookings;
DROP FUNCTION IF EXISTS lock_booking_invariant_resources();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lock_booking_invariant_resources() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(731005);
  IF TG_OP = 'DELETE' THEN
    PERFORM 1 FROM schedules WHERE id = OLD.schedule_id FOR UPDATE;
    PERFORM 1 FROM subscriptions WHERE id = OLD.subscription_id FOR UPDATE;
    RETURN OLD;
  END IF;
  PERFORM 1 FROM schedules WHERE id = NEW.schedule_id FOR UPDATE;
  PERFORM 1 FROM subscriptions WHERE id = NEW.subscription_id FOR UPDATE;
  IF TG_OP = 'UPDATE' THEN
    PERFORM 1 FROM schedules WHERE id = OLD.schedule_id FOR UPDATE;
    PERFORM 1 FROM subscriptions WHERE id = OLD.subscription_id FOR UPDATE;
  END IF;
  IF NEW.status = 'booked' THEN
    IF EXISTS (SELECT 1 FROM schedules WHERE id = NEW.schedule_id AND status = 'cancelled') THEN RAISE EXCEPTION 'BOOKING_SCHEDULE_CANCELLED: schedule % is cancelled', NEW.schedule_id USING ERRCODE = 'P0002'; END IF;
    IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE id = NEW.subscription_id AND member_id = NEW.member_id) THEN RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_OWNERSHIP: subscription % does not belong to member %', NEW.subscription_id, NEW.member_id USING ERRCODE = 'P0005'; END IF;
    IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE id = NEW.subscription_id AND status = 'active' AND expires_at > now()) THEN RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_INACTIVE_OR_EXPIRED: subscription % is not active and unexpired', NEW.subscription_id USING ERRCODE = 'P0003'; END IF;
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.status <> 'booked' OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id OR OLD.member_id IS DISTINCT FROM NEW.member_id OR OLD.schedule_id IS DISTINCT FROM NEW.schedule_id)) THEN
      IF NOT EXISTS (SELECT 1 FROM subscriptions WHERE id = NEW.subscription_id AND used_sessions < total_sessions) THEN RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_QUOTA_EXHAUSTED: subscription % has no remaining sessions', NEW.subscription_id USING ERRCODE = 'P0004'; END IF;
    END IF;
    IF (SELECT count(*) FROM bookings WHERE schedule_id = NEW.schedule_id AND status = 'booked' AND id <> NEW.id) >= (SELECT capacity FROM schedules WHERE id = NEW.schedule_id) THEN RAISE EXCEPTION 'BOOKING_CAPACITY_EXCEEDED: schedule % is full', NEW.schedule_id USING ERRCODE = 'P0001'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bookings_lock_trigger BEFORE INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION lock_booking_invariant_resources();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_booking_invariants() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE old_association boolean := false; new_association boolean := false; association_changed boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_association := OLD.status = 'booked';
    IF old_association THEN UPDATE subscriptions SET used_sessions = GREATEST(used_sessions - 1, 0), updated_at = now() WHERE id = OLD.subscription_id; PERFORM repair_booking_schedule(OLD.schedule_id); END IF;
    RETURN OLD;
  END IF;
  new_association := NEW.status = 'booked';
  IF TG_OP = 'INSERT' THEN association_changed := true; ELSE old_association := OLD.status = 'booked'; association_changed := OLD.schedule_id IS DISTINCT FROM NEW.schedule_id OR OLD.member_id IS DISTINCT FROM NEW.member_id OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id OR OLD.status IS DISTINCT FROM NEW.status; END IF;
  IF old_association AND (NOT new_association OR association_changed) THEN UPDATE subscriptions SET used_sessions = GREATEST(used_sessions - 1, 0), updated_at = now() WHERE id = OLD.subscription_id; END IF;
  IF new_association AND (TG_OP = 'INSERT' OR NOT old_association OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id OR OLD.member_id IS DISTINCT FROM NEW.member_id OR OLD.schedule_id IS DISTINCT FROM NEW.schedule_id) THEN UPDATE subscriptions SET used_sessions = used_sessions + 1, updated_at = now() WHERE id = NEW.subscription_id; END IF;
  IF old_association AND (NOT new_association OR association_changed) THEN PERFORM repair_booking_schedule(OLD.schedule_id); END IF;
  IF new_association THEN PERFORM repair_booking_schedule(NEW.schedule_id); END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bookings_invariant_trigger AFTER INSERT OR UPDATE OR DELETE ON bookings FOR EACH ROW EXECUTE FUNCTION enforce_booking_invariants();
