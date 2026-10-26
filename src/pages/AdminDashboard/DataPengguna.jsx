import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";
import { coaches } from "../../data/penggunaData";

export default function DataPengguna() {
  const [activeTab, setActiveTab] = useState("member");
  const navigate = useNavigate();

  // Data tiruan member yang sudah dilengkapi dengan status Aktif dan Hold
  const members = [
    {
      id: "MBR-001",
      name: "Andi Darmawan",
      phone: "081122334455",
      activePackage: "8 Sesi PT (1:1) - Senior Coach",
      remainingQuota: 4,
      status: "Aktif",
    },
    {
      id: "MBR-003",
      name: "Budi Customer",
      phone: "081234567890",
      activePackage: "12 Sesi Group Class",
      remainingQuota: 11,
      status: "Hold",
      holdReason: "Force Majeure (Kecelakaan)",
    },
  ];

  return (
    <div className="animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold text-deep-slate mb-2">Data Pengguna</h1>
      <p className="text-muted-gray mb-8">
        Kelola informasi keanggotaan dan ketersediaan pelatih.
      </p>

      {/* Navigasi Tab dan Tombol Tambah */}
      <div className="flex justify-between items-end border-b border-soft-border mb-8">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("member")}
            className={`pb-4 font-bold text-lg transition-colors relative ${activeTab === "member" ? "text-primary" : "text-muted-gray hover:text-deep-slate"}`}>
            Daftar Member
            {activeTab === "member" && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("coach")}
            className={`pb-4 font-bold text-lg transition-colors relative ${activeTab === "coach" ? "text-primary" : "text-muted-gray hover:text-deep-slate"}`}>
            Daftar Coach
            {activeTab === "coach" && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></span>
            )}
          </button>
        </div>

        {/* Tombol Tambah Muncul Hanya di Tab Coach */}
        {activeTab === "coach" && (
          <button
            onClick={() => navigate("/admin/pengguna/tambah-coach")}
            className="mb-2 bg-deep-slate hover:bg-primary text-pure-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"></path>
            </svg>
            Tambah Coach Baru
          </button>
        )}
      </div>

      {/* Konten Tab Member */}
      {activeTab === "member" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {members.map((member) => (
            <Card
              key={member.id}
              className={`hover:shadow-md transition-shadow border-l-4 ${member.status === "Hold" ? "border-l-purple-500 bg-purple-50/30" : "border-l-green-500"}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-deep-slate">
                    {member.name}
                  </h3>
                  <p className="text-sm font-semibold text-muted-gray">
                    {member.id} • {member.phone}
                  </p>
                </div>

                {/* Badge Status Dinamis */}
                {member.status === "Aktif" ? (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Aktif
                  </span>
                ) : (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    On Hold
                  </span>
                )}
              </div>

              <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50">
                <p className="text-xs font-bold text-muted-gray uppercase tracking-wider mb-1">
                  Paket Aktif
                </p>
                <p className="font-semibold text-deep-slate mb-3">
                  {member.activePackage}
                </p>

                <div className="flex justify-between items-center border-t border-soft-border/50 pt-3">
                  <span className="text-sm text-muted-gray">Sisa Kuota:</span>
                  <span className="text-lg font-bold text-primary">
                    {member.remainingQuota} Sesi
                  </span>
                </div>
              </div>

              {/* Action Area Khusus Member Hold */}
              {member.status === "Hold" && (
                <div className="mt-4 pt-4 border-t border-soft-border flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-md">
                    Alasan: {member.holdReason}
                  </span>
                  <button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-pure-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Aktifkan Kembali
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Konten Tab Coach */}
      {activeTab === "coach" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {coaches.map((coach) => (
            <Card
              key={coach.id}
              className="flex flex-col lg:flex-row gap-6 hover:shadow-md transition-shadow">
              <div className="lg:w-1/3 border-r border-soft-border pr-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                    {coach.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-deep-slate">
                      {coach.name}
                    </h3>
                    <p className="text-sm font-semibold text-muted-gray">
                      {coach.id}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-muted-gray uppercase tracking-wider mb-2">
                    Layanan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coach.services.map((service) => (
                      <span
                        key={service}
                        className="bg-deep-slate text-pure-white px-3 py-1 rounded-lg text-xs font-semibold">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-muted-gray uppercase tracking-wider mb-2">
                    Kelas Spesialisasi
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coach.classes.map((cls) => (
                      <span
                        key={cls}
                        className="bg-clean-bg border border-soft-border px-3 py-1 rounded-lg text-xs font-semibold text-deep-slate">
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:w-2/3 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-deep-slate flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Ketersediaan Jadwal Terdekat
                  </h4>
                  <button className="text-sm font-bold text-primary hover:text-deep-slate transition-colors">
                    Lihat Kalender Penuh
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 flex-grow">
                  {coach.schedules.map((sched, idx) => (
                    <div
                      key={idx}
                      className="bg-clean-bg border border-soft-border/50 rounded-xl p-4 flex gap-4 items-center">
                      <div className="bg-pure-white border border-soft-border rounded-lg p-2 text-center min-w-[60px] shadow-sm">
                        <p className="text-2xl font-black text-deep-slate leading-none">
                          {sched.date}
                        </p>
                        <p className="text-[10px] font-bold text-muted-gray uppercase mt-1">
                          {sched.month}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sched.availableTimes.map((time) => (
                          <span
                            key={time}
                            className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-bold">
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-auto bg-deep-slate hover:bg-primary text-pure-white py-3.5 rounded-xl font-bold transition-all flex justify-center items-center gap-2 shadow-sm">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"></path>
                  </svg>
                  Tugaskan Coach ke Member
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
