export type StatusDomain =
  | "package"
  | "member"
  | "coach"
  | "schedule"
  | "booking"
  | "payment"
  | "subscription";

type StatusConfig = {
  label: string;
  color: string;
};

export const STATUS_CONFIG: Record<
  StatusDomain,
  Record<string, StatusConfig>
> = {
  package: {
    active: {
      label: "Aktif",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    inactive: {
      label: "Tidak Aktif",
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    archived: {
      label: "Diarsipkan",
      color: "bg-gray-100 text-gray-500 border-gray-200",
    },
  },
  member: {
    active: {
      label: "Aktif",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    inactive: {
      label: "Tidak Aktif",
      color: "bg-gray-100 text-gray-500 border-gray-200",
    },
    suspended: {
      label: "Ditangguhkan",
      color: "bg-red-50 text-red-600 border-red-100",
    },
  },
  coach: {
    active: {
      label: "Aktif",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    inactive: {
      label: "Tidak Aktif",
      color: "bg-gray-100 text-gray-500 border-gray-200",
    },
    suspended: {
      label: "Ditangguhkan",
      color: "bg-red-50 text-red-600 border-red-100",
    },
  },
  schedule: {
    available: {
      label: "Tersedia",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    full: {
      label: "Penuh",
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    cancelled: {
      label: "Dibatalkan",
      color: "bg-red-50 text-red-600 border-red-100",
    },
  },
  booking: {
    booked: {
      label: "Terpesan",
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    attended: {
      label: "Hadir",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    no_show: {
      label: "Tidak Hadir",
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    cancelled: {
      label: "Dibatalkan",
      color: "bg-red-50 text-red-600 border-red-100",
    },
  },
  payment: {
    pending: {
      label: "Menunggu",
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    paid: {
      label: "Lunas",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    failed: {
      label: "Gagal",
      color: "bg-red-50 text-red-600 border-red-100",
    },
    refunded: {
      label: "Dikembalikan",
      color: "bg-gray-100 text-gray-500 border-gray-200",
    },
  },
  subscription: {
    pending: {
      label: "Menunggu",
      color: "bg-orange-50 text-orange-600 border-orange-100",
    },
    held: {
      label: "Ditahan",
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    active: {
      label: "Aktif",
      color: "bg-[#65C466]/10 text-[#52A353] border-[#65C466]/20",
    },
    expired: {
      label: "Kedaluwarsa",
      color: "bg-gray-100 text-gray-500 border-gray-200",
    },
    cancelled: {
      label: "Dibatalkan",
      color: "bg-red-50 text-red-600 border-red-100",
    },
  },
};
