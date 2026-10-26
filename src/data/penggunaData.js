export const members = [
  {
    id: "MBR-001",
    name: "Budi Customer",
    phone: "081234567890",
    activePackage: "8 Sesi PT (1:1) - Junior Coach",
    remainingQuota: 7,
    joinDate: "10 Okt 2026",
  },
  {
    id: "MBR-002",
    name: "Siti Aminah",
    phone: "089876543210",
    activePackage: "12 Sesi Group Class",
    remainingQuota: 12,
    joinDate: "15 Okt 2026",
  },
];

export const coaches = [
  {
    id: "CH-001",
    name: "Coach Fika",
    services: ["Personal Training (1:1)", "Group Class"],
    classes: ["Suspension Class", "Full Body Workout"],
    schedules: [
      {
        date: "26",
        month: "Okt 2026",
        availableTimes: ["09:00", "13:00", "15:00"],
      },
      { date: "27", month: "Okt 2026", availableTimes: ["10:00", "16:00"] },
    ],
  },
  {
    id: "CH-002",
    name: "Coach Bayu",
    services: ["Couple/Duo Training", "Group Class"],
    classes: ["Bubble Butt", "Strength Training"],
    schedules: [
      { date: "26", month: "Okt 2026", availableTimes: ["16:00", "19:00"] },
      { date: "28", month: "Okt 2026", availableTimes: ["08:00", "14:00"] },
    ],
  },
];
