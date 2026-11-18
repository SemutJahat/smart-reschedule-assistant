"use client";

import { Calendar, Clock, UserCircle, Users } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/format";
import type { BookingStatus } from "@/features/bookings/schemas";

type ScheduleStatus = "available" | "full" | "cancelled";

export interface ScheduleCardProps {
  title: string;
  coachName: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  status: ScheduleStatus | BookingStatus;
  statusType?: "schedule" | "booking";
  onClick?: () => void;
  actionButton?: React.ReactNode;
}

export function ScheduleCard({
  title,
  coachName,
  serviceName,
  startsAt,
  endsAt,
  capacity,
  bookedCount,
  status,
  statusType = "schedule",
  onClick,
  actionButton,
}: ScheduleCardProps) {
  const startTime = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
  const endTime = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));

  const isFull = bookedCount >= capacity;
  const isCancelled = status === "cancelled";

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border p-5 shadow-sm transition-all duration-200 
        ${onClick ? "cursor-pointer hover:border-[#65C466] hover:shadow-md" : "border-[#E2E8F0]"}
        ${isCancelled ? "opacity-70 bg-gray-50" : ""}
      `}>
      <div className="flex justify-between items-start mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
          {serviceName}
        </span>
        <StatusBadge type={statusType} status={status} />
      </div>

      <h3
        className={`text-lg font-bold mb-3 line-clamp-1 ${isCancelled ? "text-[#64748B]" : "text-[#1E293B]"}`}>
        {title}
      </h3>

      <div className="space-y-2 mb-5">
        <div className="flex items-center text-sm text-[#64748B]">
          <Calendar size={16} className="mr-2 text-[#64748B]" />
          <span>{formatDateTime(startsAt)}</span>
        </div>
        <div className="flex items-center text-sm text-[#64748B]">
          <Clock size={16} className="mr-2 text-[#64748B]" />
          <span>
            {startTime} - {endTime} WIB
          </span>
        </div>
        <div className="flex items-center text-sm text-[#64748B]">
          <UserCircle size={16} className="mr-2 text-[#64748B]" />
          <span>Coach {coachName}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
        <div className="flex items-center text-sm">
          <Users
            size={16}
            className={`mr-2 ${isFull && !isCancelled ? "text-orange-500" : "text-[#64748B]"}`}
          />
          <span
            className={
              isFull && !isCancelled
                ? "text-orange-600 font-medium"
                : "text-[#64748B]"
            }>
            {bookedCount} / {capacity} Terisi
          </span>
        </div>
        {actionButton && (
          <div onClick={(e) => e.stopPropagation()}>{actionButton}</div>
        )}
      </div>
    </div>
  );
}
