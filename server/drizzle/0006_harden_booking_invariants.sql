DROP TRIGGER IF EXISTS bookings_capacity_trigger ON bookings;
DROP FUNCTION IF EXISTS enforce_booking_capacity();
DROP TRIGGER IF EXISTS bookings_invariant_trigger ON bookings;
DROP FUNCTION IF EXISTS enforce_booking_invariants();
DROP TRIGGER IF EXISTS schedules_capacity_trigger ON schedules;
DROP FUNCTION IF EXISTS enforce_schedule_capacity_update();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION repair_booking_schedule(p_schedule_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_capacity integer;
  current_status schedule_status;
  current_booked_count bigint;
BEGIN
  SELECT capacity, status
    INTO current_capacity, current_status
    FROM schedules
   WHERE id = p_schedule_id;

  IF NOT FOUND OR current_status = 'cancelled' THEN
    RETURN;
  END IF;

  SELECT count(*)
    INTO current_booked_count
    FROM bookings
   WHERE schedule_id = p_schedule_id
     AND status = 'booked';

  UPDATE schedules
     SET status = CASE WHEN current_booked_count >= current_capacity THEN 'full'::schedule_status ELSE 'available'::schedule_status END,
         updated_at = now()
   WHERE id = p_schedule_id;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_booking_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booked_count bigint;
  old_association boolean := false;
  new_association boolean := false;
  association_changed boolean := false;
BEGIN
  PERFORM pg_advisory_xact_lock(731005);

  IF TG_OP = 'DELETE' THEN
    old_association := OLD.status = 'booked';
    IF old_association THEN
      PERFORM 1 FROM schedules WHERE id = OLD.schedule_id FOR UPDATE;
      PERFORM 1 FROM subscriptions WHERE id = OLD.subscription_id FOR UPDATE;
      UPDATE subscriptions
         SET used_sessions = GREATEST(used_sessions - 1, 0), updated_at = now()
       WHERE id = OLD.subscription_id;
      PERFORM repair_booking_schedule(OLD.schedule_id);
    END IF;
    RETURN OLD;
  END IF;

  new_association := NEW.status = 'booked';
  IF TG_OP = 'INSERT' THEN
    association_changed := true;
  ELSE
    old_association := OLD.status = 'booked';
    association_changed := OLD.schedule_id IS DISTINCT FROM NEW.schedule_id
      OR OLD.member_id IS DISTINCT FROM NEW.member_id
      OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id
      OR OLD.status IS DISTINCT FROM NEW.status;
  END IF;

  IF old_association AND (NOT new_association OR association_changed) THEN
    -- The row has already moved/status-changed in this AFTER trigger, so it is
    -- absent from the old schedule's booked count.
    PERFORM 1 FROM schedules WHERE id = OLD.schedule_id FOR UPDATE;
    PERFORM 1 FROM subscriptions WHERE id = OLD.subscription_id FOR UPDATE;
    UPDATE subscriptions
       SET used_sessions = GREATEST(used_sessions - 1, 0), updated_at = now()
     WHERE id = OLD.subscription_id;
  END IF;

  IF new_association THEN
    -- Lock both resource classes in a stable order. The application and all
    -- direct writers share the advisory lock above.
    PERFORM 1 FROM schedules WHERE id = NEW.schedule_id FOR UPDATE;
    PERFORM 1 FROM subscriptions WHERE id = NEW.subscription_id FOR UPDATE;

    IF EXISTS (SELECT 1 FROM schedules WHERE id = NEW.schedule_id AND status = 'cancelled') THEN
      RAISE EXCEPTION 'BOOKING_SCHEDULE_CANCELLED: schedule % is cancelled', NEW.schedule_id
        USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM subscriptions
       WHERE id = NEW.subscription_id
         AND member_id = NEW.member_id
    ) THEN
      RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_OWNERSHIP: subscription % does not belong to member %', NEW.subscription_id, NEW.member_id
        USING ERRCODE = 'P0005';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM subscriptions
       WHERE id = NEW.subscription_id
         AND status = 'active'
         AND expires_at > now()
    ) THEN
      RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_INACTIVE_OR_EXPIRED: subscription % is not active and unexpired', NEW.subscription_id
        USING ERRCODE = 'P0003';
    END IF;

    IF TG_OP = 'INSERT' OR NOT old_association OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id
       OR OLD.member_id IS DISTINCT FROM NEW.member_id OR OLD.schedule_id IS DISTINCT FROM NEW.schedule_id THEN
      IF NOT EXISTS (
        SELECT 1 FROM subscriptions
         WHERE id = NEW.subscription_id
           AND used_sessions < total_sessions
      ) THEN
        RAISE EXCEPTION 'BOOKING_SUBSCRIPTION_QUOTA_EXHAUSTED: subscription % has no remaining sessions', NEW.subscription_id
          USING ERRCODE = 'P0004';
      END IF;
    END IF;

    SELECT count(*)
      INTO booked_count
      FROM bookings
     WHERE schedule_id = NEW.schedule_id
       AND status = 'booked'
       AND id <> NEW.id;

    IF booked_count >= (SELECT capacity FROM schedules WHERE id = NEW.schedule_id) THEN
      RAISE EXCEPTION 'BOOKING_CAPACITY_EXCEEDED: schedule % is full', NEW.schedule_id
        USING ERRCODE = 'P0001';
    END IF;

    IF TG_OP = 'INSERT' OR NOT old_association OR OLD.subscription_id IS DISTINCT FROM NEW.subscription_id
       OR OLD.member_id IS DISTINCT FROM NEW.member_id OR OLD.schedule_id IS DISTINCT FROM NEW.schedule_id THEN
      UPDATE subscriptions
         SET used_sessions = used_sessions + 1, updated_at = now()
       WHERE id = NEW.subscription_id;
    END IF;
  END IF;

  IF old_association AND (NOT new_association OR association_changed) THEN
    PERFORM repair_booking_schedule(OLD.schedule_id);
  END IF;
  IF new_association THEN
    PERFORM repair_booking_schedule(NEW.schedule_id);
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bookings_invariant_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_invariants();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_schedule_capacity_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  booked_count bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(731005);
  PERFORM 1 FROM schedules WHERE id = OLD.id FOR UPDATE;

  SELECT count(*)
    INTO booked_count
    FROM bookings
   WHERE schedule_id = OLD.id
     AND status = 'booked';

  IF NEW.capacity < booked_count THEN
    RAISE EXCEPTION 'BOOKING_CAPACITY_REDUCTION: schedule % has % booked bookings', OLD.id, booked_count
      USING ERRCODE = 'P0006';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER schedules_capacity_trigger
  BEFORE UPDATE OF capacity ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION enforce_schedule_capacity_update();
