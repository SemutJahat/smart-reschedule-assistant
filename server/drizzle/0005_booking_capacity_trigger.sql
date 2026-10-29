CREATE OR REPLACE FUNCTION enforce_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  schedule_capacity integer;
  booked_count integer;
BEGIN
  IF NEW.status = 'booked' THEN
    SELECT capacity
      INTO schedule_capacity
      FROM schedules
     WHERE id = NEW.schedule_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule % does not exist', NEW.schedule_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT count(*)
      INTO booked_count
      FROM bookings
     WHERE schedule_id = NEW.schedule_id
       AND status = 'booked'
       AND id <> NEW.id;

    IF booked_count >= schedule_capacity THEN
      RAISE EXCEPTION 'Schedule % is full (capacity %)', NEW.schedule_id, schedule_capacity
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER bookings_capacity_trigger
  BEFORE INSERT OR UPDATE OF status, schedule_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_booking_capacity();
