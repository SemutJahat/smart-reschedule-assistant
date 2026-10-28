import { useState } from "react";
import Card from "../../components/Card";

export default function ManajemenJadwal() {
  const [coaches, setCoaches] = useState([
    {
      id: "C-001",
      name: "Coach Fika",
      specialty: "Suspension & Group Class",
      status: "Aktif",
      substituteName: null,
      absenceReason: null,
      members: [
        { id: "MBR-002", name: "Siti Aminah", package: "12 Sesi Group Class" },
        { id: "MBR-004", name: "Rina Gunawan", package: "8 Sesi PT (1:1)" },
      ],
      schedules: [
        {
          id: "SCH-1",
          date: "24 Okt 2026",
          time: "09:00 - 10:00",
          class: "Suspension Class",
          member: "Siti Aminah",
        },
      ],
    },
    {
      id: "C-002",
      name: "Coach Bima",
      specialty: "Weightlifting & Hypertrophy",
      status: "Berhalangan",
      substituteName: "Coach Fika",
      absenceReason: "Sakit",
      members: [
        { id: "MBR-003", name: "Budi Customer", package: "Unlimited PT" },
      ],
      schedules: [
        {
          id: "SCH-2",
          date: "25 Okt 2026",
          time: "16:00 - 17:00",
          class: "Push Day",
          member: "Budi Customer",
        },
      ],
    },
    {
      id: "C-003",
      name: "Coach Reza",
      specialty: "Cardio & Endurance",
      status: "Aktif",
      substituteName: null,
      absenceReason: null,
      members: [
        { id: "MBR-001", name: "Andi Darmawan", package: "8 Sesi PT (1:1)" },
      ],
      schedules: [
        {
          id: "SCH-3",
          date: "26 Okt 2026",
          time: "08:00 - 09:00",
          class: "Full Body Workout",
          member: "Andi Darmawan",
        },
      ],
    },
  ]);

  // State Manajemen Modal Multi-Tahap
  const [substitutingCoachId, setSubstitutingCoachId] = useState(null);
  const [absenceReason, setAbsenceReason] = useState("");
  const [modalStep, setModalStep] = useState("input"); // 'input' | 'confirm' | 'success'
  const [selectedSubstitute, setSelectedSubstitute] = useState(null);

  const handleOpenModal = (coachId) => {
    setSubstitutingCoachId(coachId);
    setAbsenceReason("");
    setSelectedSubstitute(null);
    setModalStep("input");
  };

  const handleCloseModal = () => {
    if (modalStep === "success") return; // Cegah tutup paksa saat loading sukses
    setSubstitutingCoachId(null);
    setTimeout(() => {
      setAbsenceReason("");
      setSelectedSubstitute(null);
      setModalStep("input");
    }, 300); // Delay agar animasi transisi bersih
  };

  const handleSelectSubstitute = (sub) => {
    setSelectedSubstitute(sub);
    setModalStep("confirm"); // Pindah ke tahap konfirmasi
  };

  const handleFinalSubmit = () => {
    setCoaches((prev) =>
      prev.map((coach) =>
        coach.id === substitutingCoachId
          ? {
              ...coach,
              status: "Berhalangan",
              substituteName: selectedSubstitute.name,
              absenceReason: absenceReason,
            }
          : coach,
      ),
    );

    setModalStep("success"); // Pindah ke tahap sukses

    // Otomatis menutup modal setelah 2 detik
    setTimeout(() => {
      setSubstitutingCoachId(null);
      setTimeout(() => setModalStep("input"), 300);
    }, 2000);
  };

  const handleSetAktifKembali = (coachId) => {
    setCoaches((prev) =>
      prev.map((coach) =>
        coach.id === coachId
          ? {
              ...coach,
              status: "Aktif",
              substituteName: null,
              absenceReason: null,
            }
          : coach,
      ),
    );
  };

  const currentTargetCoach = coaches.find((c) => c.id === substitutingCoachId);
  const availableSubstitutes = coaches.filter(
    (c) => c.status === "Aktif" && c.id !== substitutingCoachId,
  );
  const reasonOptions = ["Sakit", "Cuti Tahunan", "Izin Mendadak"];

  return (
    <div className="animate-in fade-in duration-300 relative">
      <h1 className="text-3xl font-bold text-deep-slate mb-2">
        Manajemen Jadwal & Penugasan
      </h1>
      <p className="text-muted-gray mb-8">
        Pantau relasi Coach dengan Member serta atur pengalihan jadwal secara
        terpusat.
      </p>

      {/* DAFTAR CARD COACH */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {coaches.map((coach) => (
          <Card
            key={coach.id}
            className={`border-t-4 transition-all ${
              coach.status === "Berhalangan"
                ? "border-t-orange-500 bg-orange-50/30"
                : "border-t-primary"
            }`}>
            <div className="flex justify-between items-start mb-6 border-b border-soft-border pb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${
                    coach.status === "Berhalangan"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-primary/10 text-primary"
                  }`}>
                  {coach.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-deep-slate">
                      {coach.name}
                    </h2>
                    {coach.status === "Berhalangan" && (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {coach.absenceReason || "Berhalangan"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-muted-gray">
                    {coach.specialty}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {coach.status === "Aktif" && (
                  <button
                    onClick={() => handleOpenModal(coach.id)}
                    className="text-sm font-bold text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors border border-orange-200 shadow-sm flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    Tandai Berhalangan
                  </button>
                )}

                {coach.status === "Berhalangan" && (
                  <button
                    onClick={() => handleSetAktifKembali(coach.id)}
                    className="text-xs font-bold text-primary hover:text-deep-slate transition-colors underline">
                    Batalkan / Aktifkan Kembali
                  </button>
                )}
              </div>
            </div>

            {coach.status === "Berhalangan" && coach.substituteName && (
              <div className="mb-6 bg-orange-100 border border-orange-200 p-4 rounded-xl flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-orange-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <p className="text-sm font-bold text-orange-800">
                    Kelas Dialihkan Sementara
                  </p>
                  <p className="text-xs font-medium text-orange-700 mt-1">
                    Jadwal dan member di bawah ini ditangani oleh{" "}
                    <strong>{coach.substituteName}</strong>. Sistem telah
                    memberitahu member terkait.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-muted-gray uppercase tracking-wider mb-3">
                  Member Binaan ({coach.members.length})
                </h3>
                <div className="space-y-2">
                  {coach.members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-clean-bg border border-soft-border rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-deep-slate">
                          {member.name}
                        </p>
                        <p className="text-[10px] font-semibold text-muted-gray mt-0.5">
                          {member.package}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                        Aktif
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-muted-gray uppercase tracking-wider mb-3">
                  Jadwal Terdekat
                </h3>
                <div className="space-y-2">
                  {coach.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-pure-white border border-soft-border rounded-lg p-3 shadow-sm relative overflow-hidden">
                      {coach.status === "Berhalangan" && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                      )}
                      <p className="text-xs font-bold text-primary mb-1">
                        {schedule.date} • {schedule.time}
                      </p>
                      <p className="text-sm font-bold text-deep-slate">
                        {schedule.class}
                      </p>
                      <p className="text-xs font-medium text-muted-gray mt-1 flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        {schedule.member}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* SINGLE DYNAMIC MODAL MULTI-TAHAP */}
      {substitutingCoachId && currentTargetCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/70 backdrop-blur-sm p-4">
          <div className="bg-pure-white rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* TAHAP 1: INPUT ALASAN & PILIH PENGGANTI */}
            {modalStep === "input" && (
              <>
                <div className="p-6 border-b border-soft-border bg-clean-bg shrink-0">
                  <h2 className="text-xl font-bold text-deep-slate">
                    Pengalihan Jadwal Coach
                  </h2>
                  <p className="text-sm text-muted-gray mt-1">
                    Atur ketidakhadiran{" "}
                    <span className="font-bold text-deep-slate">
                      {currentTargetCoach.name}
                    </span>{" "}
                    secara sistematis.
                  </p>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                  <div>
                    <label className="block text-sm font-bold text-deep-slate mb-3 flex items-center gap-2">
                      <span className="bg-deep-slate text-pure-white w-5 h-5 rounded-full flex items-center justify-center text-xs">
                        1
                      </span>
                      Pilih Alasan Ketidakhadiran
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {reasonOptions.map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setAbsenceReason(reason)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                            absenceReason === reason
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-soft-border text-muted-gray hover:border-primary/50"
                          }`}>
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-deep-slate mb-3 flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${absenceReason ? "bg-deep-slate text-pure-white" : "bg-soft-border text-muted-gray"}`}>
                        2
                      </span>
                      Pilih Coach Pengganti
                    </label>

                    {!absenceReason ? (
                      <div className="bg-clean-bg border-2 border-dashed border-soft-border rounded-xl p-8 text-center flex flex-col items-center justify-center">
                        <svg
                          className="w-8 h-8 text-muted-gray mb-3 opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                        <p className="text-sm font-semibold text-muted-gray">
                          Selesaikan Langkah 1 untuk membuka rekomendasi sistem.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {availableSubstitutes.length === 0 ? (
                          <p className="text-center text-muted-gray py-4">
                            Tidak ada Coach aktif yang tersedia saat ini.
                          </p>
                        ) : (
                          availableSubstitutes.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSelectSubstitute(sub)}
                              className="w-full text-left bg-pure-white border-2 border-soft-border hover:border-primary hover:bg-primary/5 rounded-xl p-4 transition-all group flex items-center justify-between">
                              <div>
                                <h3 className="text-base font-bold text-deep-slate group-hover:text-primary transition-colors">
                                  {sub.name}
                                </h3>
                                <p className="text-xs font-semibold text-muted-gray mt-0.5">
                                  {sub.specialty}
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                                    Jadwal Cocok
                                  </span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-clean-bg group-hover:bg-primary text-transparent group-hover:text-pure-white flex items-center justify-center transition-colors">
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2.5"
                                    d="M5 13l4 4L19 7"></path>
                                </svg>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-soft-border bg-clean-bg flex justify-end shrink-0">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 bg-pure-white border border-soft-border text-deep-slate hover:bg-soft-border rounded-xl font-bold transition-all">
                    Batal
                  </button>
                </div>
              </>
            )}

            {/* TAHAP 2: KONFIRMASI */}
            {modalStep === "confirm" && (
              <div className="p-8 text-center animate-in slide-in-from-right-4 duration-300">
                <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full mx-auto flex items-center justify-center mb-5">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-deep-slate mb-2">
                  Konfirmasi Pengalihan
                </h2>
                <p className="text-muted-gray mb-8">
                  Anda akan mengalihkan{" "}
                  <strong>
                    {currentTargetCoach.schedules.length} jadwal kelas
                  </strong>{" "}
                  dan{" "}
                  <strong>{currentTargetCoach.members.length} member</strong>{" "}
                  dari {currentTargetCoach.name} kepada{" "}
                  <strong>{selectedSubstitute?.name}</strong> dengan alasan{" "}
                  <strong>{absenceReason}</strong>.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setModalStep("input")}
                    className="w-1/2 py-3.5 bg-pure-white border-2 border-soft-border text-deep-slate hover:border-deep-slate rounded-xl font-bold transition-all">
                    Kembali
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    className="w-1/2 py-3.5 bg-primary hover:bg-opacity-90 text-pure-white rounded-xl font-bold transition-all shadow-md">
                    Ya, Alihkan
                  </button>
                </div>
              </div>
            )}

            {/* TAHAP 3: SUKSES */}
            {modalStep === "success" && (
              <div className="p-10 text-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full mx-auto flex items-center justify-center mb-5">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-deep-slate mb-2">
                  Pengalihan Berhasil!
                </h2>
                <p className="text-muted-gray">
                  Jadwal telah diperbarui dan sistem sedang memberitahu member
                  terkait.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
