import type { SubscriptionRecord, SubscriptionStatus } from "../payments/schema";
import type { ScheduleRecord } from "../coaches/schema";

export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export interface BookingRecord {
  id: string;
  memberId: string;
  scheduleId: string;
  subscriptionId: string;
  status: BookingStatus;
  bookedAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingFilters {
  memberId?: string;
  status?: BookingStatus;
  date?: string;
}

export interface NewBooking {
  memberId: string;
  scheduleId: string;
  subscriptionId: string;
}

export interface BookingPatch {
  status?: BookingStatus;
  cancelledAt?: Date | null;
}

export interface BookingRepository {
  /** PostgreSQL trigger-backed repositories apply quota/status side effects. */
  readonly databaseEnforcesBookingInvariants?: boolean;
  transaction<T>(fn: (tx: BookingRepository) => Promise<T>): Promise<T>;
  findSchedule(id: string, lock?: boolean): Promise<ScheduleRecord | null>;
  updateScheduleStatus(id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | null>;
  findSubscription(id: string, lock?: boolean): Promise<SubscriptionRecord | null>;
  updateSubscriptionUsed(id: string, usedSessions: number): Promise<SubscriptionRecord | null>;
  countBooked(scheduleId: string): Promise<number>;
  findActiveByMemberSchedule(memberId: string, scheduleId: string, lock?: boolean): Promise<BookingRecord | null>;
  findBooking(id: string, lock?: boolean): Promise<BookingRecord | null>;
  listBookings(filters?: BookingFilters): Promise<BookingRecord[]>;
  insertBooking(input: NewBooking): Promise<BookingRecord>;
  updateBooking(id: string, patch: BookingPatch): Promise<BookingRecord | null>;
}

export type BookingContext = {
  schedule: ScheduleRecord;
  subscription: SubscriptionRecord;
};

export type { SubscriptionStatus };
