export type BookingStatus = "booked" | "cancelled" | "attended" | "no_show";

export interface BookingDTO {
  id: string;
  memberId: string;
  scheduleId: string;
  subscriptionId: string;
  status: BookingStatus;
  bookedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingWithScheduleDTO extends BookingDTO {
  schedule: {
    title: string;
    coachName: string;
    serviceName: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    bookedCount: number;
    status: "available" | "full" | "cancelled";
  };
}
