import type { ScheduleRecord } from "../coaches/schema";
import type { BookingRecord, BookingRepository } from "../bookings/schema";

export type RescheduleStatus = "pending" | "held" | "approved" | "rejected" | "cancelled";

export interface RescheduleRequestRecord {
  id: string;
  bookingId: string;
  memberId: string;
  fromScheduleId: string;
  toScheduleId: string;
  customerMessage: string | null;
  adminNote: string | null;
  status: RescheduleStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewRescheduleRequest {
  bookingId: string;
  memberId: string;
  fromScheduleId: string;
  toScheduleId: string;
  customerMessage: string;
}

export interface RescheduleRequestPatch {
  status?: RescheduleStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
}

export interface RescheduleFilters {
  memberId?: string;
  status?: RescheduleStatus;
}

export interface RescheduleRepository {
  readonly databaseEnforcesBookingInvariants?: boolean;
  transaction<T>(fn: (tx: RescheduleRepository) => Promise<T>): Promise<T>;
  findRequest(id: string, lock?: boolean): Promise<RescheduleRequestRecord | null>;
  listRequests(filters?: RescheduleFilters): Promise<RescheduleRequestRecord[]>;
  insertRequest(input: NewRescheduleRequest): Promise<RescheduleRequestRecord>;
  updateRequest(id: string, patch: RescheduleRequestPatch): Promise<RescheduleRequestRecord | null>;
  findBooking(id: string, lock?: boolean): Promise<BookingRecord | null>;
  updateBookingSchedule(id: string, scheduleId: string): Promise<BookingRecord | null>;
  findSchedule(id: string, lock?: boolean): Promise<ScheduleRecord | null>;
  updateScheduleStatus(id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | null>;
  countBooked(scheduleId: string): Promise<number>;
}

export type RescheduleBookingRepository = BookingRepository;
