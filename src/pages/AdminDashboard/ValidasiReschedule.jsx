import Card from "../../components/Card";

export default function ValidasiReschedule() {
  // Data simulasi yang sudah diperkaya dengan hasil analisis AI berdasarkan Waiver Form
  const pendingRequests = [
    {
      id: "REQ-001",
      customerName: "Andi Darmawan",
      originalMessage:
        "Halo min, lusa saya ada dinas ke luar kota. Kelas hari kamis bisa digeser ke sabtu pagi?",
      originalSchedule: "Full Body Workout - 29 Okt 2026, 19:00",
      requestedSchedule: "Full Body Workout - 31 Okt 2026, 08:00",
      status: "Pending",
      isUnder6Hours: false,
      isForceMajeure: false,
    },
    {
      id: "REQ-002",
      customerName: "Siti Aminah",
      originalMessage:
        "Min, maaf aku telat bangun nih, jadwalku jam 9 pagi ini bisa digeser ke besok ga?",
      originalSchedule: "Push Day - 27 Okt 2026, 09:00",
      requestedSchedule: "Push Day - 28 Okt 2026, 09:00",
      status: "Pending",
      isUnder6Hours: true, // Pelanggaran Poin 6
      isForceMajeure: false,
    },
    {
      id: "REQ-003",
      customerName: "Budi Customer",
      originalMessage:
        "Halo min, mendadak saya harus ke IGD karena kecelakaan. Gak bisa ikut kelas sore ini.",
      originalSchedule: "Suspension Class - 27 Okt 2026, 16:00",
      requestedSchedule: "Tunda Sementara (Hold)",
      status: "Pending",
      isUnder6Hours: true,
      isForceMajeure: true, // Pengecualian Poin 7 & 14
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-deep-slate mb-2">
        Validasi Smart Reschedule
      </h1>
      <p className="text-muted-gray mb-8">
        Tinjau permintaan pelanggan. Sistem AI telah melabeli pengajuan
        berdasarkan aturan Syarat & Ketentuan Gymnasyum.
      </p>

      <div className="space-y-6">
        {pendingRequests.length === 0 ? (
          <Card>
            <p className="text-center text-muted-gray py-8">
              Tidak ada antrean validasi saat ini.
            </p>
          </Card>
        ) : (
          pendingRequests.map((req) => (
            <Card
              key={req.id}
              className={`border-l-4 ${
                req.isForceMajeure
                  ? "border-l-purple-500"
                  : req.isUnder6Hours
                    ? "border-l-red-500"
                    : "border-l-orange-500"
              }`}>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Info Pelanggan & Pesan Asli */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Perlu Tindakan
                    </span>

                    {/* Label Peringatan Berdasarkan Analisis AI */}
                    {req.isForceMajeure ? (
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        🚨 Force Majeure / Darurat
                      </span>
                    ) : req.isUnder6Hours ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        ⚠️ Batal &lt; 6 Jam
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        ✅ Sesuai Aturan (&gt; 6 Jam)
                      </span>
                    )}

                    <span className="text-sm font-bold text-muted-gray ml-auto">
                      {req.id}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-deep-slate mb-1">
                    {req.customerName}
                  </h2>

                  <div className="bg-clean-bg p-4 rounded-xl mt-4 border border-soft-border/50 relative">
                    <span className="absolute -top-3 left-4 bg-pure-white px-2 text-xs font-bold text-muted-gray">
                      Pesan WhatsApp Pelanggan
                    </span>
                    <p className="text-deep-slate font-medium italic mt-2">
                      "{req.originalMessage}"
                    </p>
                  </div>
                </div>

                {/* Ekstraksi AI & Tombol Aksi yang Dinamis */}
                <div className="flex-1 flex flex-col justify-between">
                  <div
                    className={`border p-5 rounded-xl ${
                      req.isForceMajeure
                        ? "bg-purple-50 border-purple-200"
                        : req.isUnder6Hours
                          ? "bg-red-50 border-red-200"
                          : "bg-primary/5 border-primary/20"
                    }`}>
                    <h3
                      className={`text-sm font-bold mb-3 uppercase tracking-wider flex items-center gap-2 ${
                        req.isForceMajeure
                          ? "text-purple-700"
                          : req.isUnder6Hours
                            ? "text-red-700"
                            : "text-primary"
                      }`}>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      Rekomendasi Tindakan AI
                    </h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-soft-border pb-2">
                        <span className="text-muted-gray">Jadwal Lama:</span>
                        <span className="font-semibold text-deep-slate text-right">
                          {req.originalSchedule}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-gray">Jadwal Baru:</span>
                        <span
                          className={`font-bold text-right ${req.isForceMajeure ? "text-purple-700" : "text-primary"}`}>
                          {req.requestedSchedule}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Render Tombol Berdasarkan Kondisi Bisnis */}
                  <div className="flex gap-3 mt-6">
                    {req.isForceMajeure ? (
                      <>
                        <button className="flex-1 bg-pure-white border-2 border-red-500 text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold transition-all">
                          Tolak Alasan
                        </button>
                        <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-pure-white py-3 rounded-xl font-bold shadow-md transition-all">
                          Setujui & Hold Paket
                        </button>
                      </>
                    ) : req.isUnder6Hours ? (
                      <>
                        <button className="flex-1 bg-pure-white border-2 border-primary text-primary hover:bg-primary/5 py-3 rounded-xl font-bold transition-all">
                          Beri Toleransi
                        </button>
                        <button className="flex-1 bg-red-500 hover:bg-red-600 text-pure-white py-3 rounded-xl font-bold shadow-md transition-all">
                          Tolak & Hanguskan Sesi
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="flex-1 bg-pure-white border-2 border-red-500 text-red-500 hover:bg-red-50 py-3 rounded-xl font-bold transition-all">
                          Tolak
                        </button>
                        <button className="flex-1 bg-primary hover:bg-opacity-90 text-pure-white py-3 rounded-xl font-bold shadow-md transition-all">
                          Setujui Jadwal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
