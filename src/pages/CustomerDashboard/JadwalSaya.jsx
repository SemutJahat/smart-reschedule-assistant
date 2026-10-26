import { useState } from "react";
import Card from "../../components/Card";
import ModalReschedule from "../../components/ModalReschedule";

export default function JadwalSaya() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State untuk melacak apakah pelanggan sudah mengajukan reschedule
  const [requestStatus, setRequestStatus] = useState("none"); // 'none' | 'pending'

  // Data tiruan untuk mendemonstrasikan kelas pelanggan
  const upcomingClass = {
    title: "Suspension Class",
    date: "Sabtu, 24 Okt 2026",
    time: "09:00 - 10:00",
    instructor: "Coach Fika",
    location: "Gymnasyum Bintaro",
  };

  // Fungsi simulasi saat pengguna selesai mengirim form di modal
  const handleRescheduleSubmit = () => {
    setIsModalOpen(false);
    setRequestStatus("pending");
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold text-deep-slate mb-2">
        Jadwal Latihan Saya
      </h1>
      <p className="text-muted-gray mb-8">
        Pantau kelas mendatang dan kelola jadwal Anda dengan mudah.
      </p>

      <Card>
        <div className="flex justify-between items-center mb-6 border-b border-soft-border pb-4">
          <h2 className="text-xl font-bold text-deep-slate">Kelas Mendatang</h2>
          {requestStatus === "pending" && (
            <span className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Menunggu Validasi Admin
            </span>
          )}
        </div>

        {/* Kartu Kelas Spesifik */}
        <div
          className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-clean-bg border rounded-2xl p-6 gap-6 transition-all ${requestStatus === "pending" ? "border-orange-300 bg-orange-50/30" : "border-soft-border hover:shadow-md"}`}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold tracking-wide ${requestStatus === "pending" ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                {requestStatus === "pending"
                  ? "Sedang Diproses AI"
                  : "Telah Ditempah"}
              </span>
              <h3 className="text-xl font-extrabold text-deep-slate">
                {upcomingClass.title}
              </h3>
            </div>

            <div className="space-y-2 text-muted-gray font-semibold mt-5">
              <p className="flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                {upcomingClass.date} • {upcomingClass.time}
              </p>
              <p className="flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                {upcomingClass.instructor}
              </p>
              <p className="flex items-center gap-2.5">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                {upcomingClass.location}
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto shrink-0 mt-4 md:mt-0">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={requestStatus === "pending"}
              className={`w-full md:w-auto px-7 py-3.5 rounded-full font-bold transition-all flex items-center justify-center gap-2 ${
                requestStatus === "pending"
                  ? "bg-soft-border text-muted-gray cursor-not-allowed"
                  : "bg-primary hover:bg-opacity-90 text-pure-white shadow-lg shadow-primary/30"
              }`}>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
              </svg>
              {requestStatus === "pending"
                ? "Reschedule Diproses"
                : "Ajukan Reschedule"}
            </button>
          </div>
        </div>

        {/* Ringkasan Kebijakan Reschedule (Waiver Form) */}
        {requestStatus === "none" && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Kebijakan Reschedule Gymnasyum
            </h4>
            <ul className="text-sm text-blue-700 space-y-1.5 list-disc list-inside">
              <li>
                Pengajuan wajib dilakukan maksimal{" "}
                <strong>6 jam sebelum</strong> kelas dimulai.
              </li>
              <li>
                Pembatalan mendadak (&lt; 6 jam) akan menghanguskan kuota sesi
                latihan Anda.
              </li>
              <li>
                Pengecualian khusus diberikan untuk keadaan darurat medis
                (Sakit/Kecelakaan) dengan status <em>Hold Paket</em>.
              </li>
            </ul>
            {/* SEKSI BARU: Riwayat & Status Pengajuan (Menggantikan Halaman Status Reschedule) */}
            <div className="mt-10">
              <h2 className="text-xl font-bold text-deep-slate mb-6">
                Riwayat & Status Pengajuan
              </h2>

              <Card className="border-l-4 border-l-orange-400">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 border-b border-soft-border pb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold text-muted-gray uppercase">
                        ID: REQ-001
                      </span>
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                        Menunggu Konfirmasi Admin
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-deep-slate">
                      Suspension Class
                    </h3>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold text-muted-gray mb-1">
                      Jadwal Rekomendasi AI:
                    </p>
                    <p className="text-sm font-bold text-primary">
                      Pindah ke Sabtu, 24 Okt 2026
                    </p>
                  </div>
                </div>

                <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50 relative mt-2">
                  <span className="absolute -top-3 left-4 bg-pure-white px-2 text-xs font-bold text-muted-gray">
                    Pesan Anda kepada AI
                  </span>
                  <p className="text-deep-slate font-medium italic mt-1 text-sm">
                    "Halo min, esok pagi saya tak boleh ikut kelas, boleh tolong
                    ubah ke hari Sabtu?"
                  </p>
                </div>

                <div className="mt-4 pt-3 flex justify-between items-center text-xs font-semibold text-muted-gray">
                  <span>Diajukan pada: 23 Okt 2026, 09:45</span>
                  {/* Jika ditolak, pesannya akan muncul di sini (Contoh: Ditolak karena batal < 6 jam) */}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>

      {/* Komponen Modal */}
      <ModalReschedule
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classTitle={upcomingClass.title}
        onSubmit={handleRescheduleSubmit}
      />
    </div>
  );
}
