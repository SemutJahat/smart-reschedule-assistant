import Card from "../../components/Card";

export default function StatusReschedule() {
  // Data tiruan pengajuan reschedule
  const requests = [
    {
      id: "REQ-001",
      className: "Suspension Class",
      submittedAt: "23 Okt 2026, 09:45",
      originalMessage:
        "Halo min, esok pagi saya tak boleh ikut kelas, boleh tolong ubah ke hari Sabtu?",
      aiInterpretation: "Pindah ke Sabtu, 24 Okt 2026",
      status: "Pending", // Bisa: Pending, Approved, Rejected
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return (
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-bold">
            Menunggu Konfirmasi
          </span>
        );
      case "Approved":
        return (
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
            Disetujui
          </span>
        );
      case "Rejected":
        return (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
            Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-deep-slate mb-2">
        Status Reschedule
      </h1>
      <p className="text-muted-gray mb-8">
        Pantau status pengajuan perubahan jadwal kelas Anda di sini.
      </p>

      <div className="space-y-6">
        {requests.map((req) => (
          <Card key={req.id}>
            <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
              <div>
                <p className="text-sm font-bold text-muted-gray mb-1">
                  ID Pengajuan: {req.id}
                </p>
                <h2 className="text-xl font-bold text-deep-slate">
                  {req.className}
                </h2>
              </div>
              <div>{getStatusBadge(req.status)}</div>
            </div>

            <div className="bg-clean-bg rounded-xl p-4 mb-4 border border-soft-border/50">
              <p className="text-sm font-semibold text-deep-slate mb-1">
                Pesan Anda:
              </p>
              <p className="text-muted-gray italic">"{req.originalMessage}"</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm font-medium border-t border-soft-border pt-4 mt-2">
              <p className="text-muted-gray">
                Diajukan pada: {req.submittedAt}
              </p>
              <p className="text-primary mt-2 sm:mt-0 font-bold">
                Jadwal Baru: {req.aiInterpretation}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
