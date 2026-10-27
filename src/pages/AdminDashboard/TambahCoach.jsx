import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";

export default function TambahCoach() {
  const navigate = useNavigate();

  // State untuk Periode Kontrak (Masa Berlaku Jadwal)
  const [period, setPeriod] = useState({ startDate: "", endDate: "" });

  // State untuk Pola Jadwal Mingguan
  const [weeklySchedule, setWeeklySchedule] = useState([
    { day: "Senin", isActive: false, times: [] },
    { day: "Selasa", isActive: false, times: [] },
    { day: "Rabu", isActive: false, times: [] },
    { day: "Kamis", isActive: false, times: [] },
    { day: "Jumat", isActive: false, times: [] },
    { day: "Sabtu", isActive: false, times: [] },
    { day: "Minggu", isActive: false, times: [] },
  ]);

  const daftarKelas = [
    "Push Day",
    "Pull Day",
    "Upper Body & Core Sculpt (Woman Only)",
    "Full Body Workout (Woman Only)",
    "Suspension Class (Woman Only)",
    "Calisthenic Night",
    "Calisthenic Flow",
    "Bubble Butt",
    "Boxing for Beginner",
  ];

  const jamOperasional = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "19:00",
    "20:00",
  ];

  // --- Handlers ---
  const handlePeriodChange = (field, value) => {
    setPeriod({ ...period, [field]: value });
  };

  const handleDayToggle = (index) => {
    const newSchedule = [...weeklySchedule];
    newSchedule[index].isActive = !newSchedule[index].isActive;
    // Jika dinonaktifkan, kosongkan pilihan jamnya
    if (!newSchedule[index].isActive) {
      newSchedule[index].times = [];
    }
    setWeeklySchedule(newSchedule);
  };

  const handleTimeToggle = (dayIndex, time) => {
    const newSchedule = [...weeklySchedule];
    const currentTimes = newSchedule[dayIndex].times;

    if (currentTimes.includes(time)) {
      newSchedule[dayIndex].times = currentTimes.filter((t) => t !== time);
    } else {
      newSchedule[dayIndex].times = [...currentTimes, time].sort();
    }
    setWeeklySchedule(newSchedule);
  };

  const handleSimpan = (e) => {
    e.preventDefault();

    // Validasi 1: Pastikan periode diisi
    if (!period.startDate || !period.endDate) {
      alert("Mohon isi Periode Berlaku Jadwal (Mulai & Sampai Tanggal).");
      return;
    }

    // Validasi 2: Pastikan minimal ada 1 hari kerja yang aktif
    const activeDays = weeklySchedule.filter((day) => day.isActive);
    if (activeDays.length === 0) {
      alert("Mohon aktifkan minimal satu hari kerja untuk coach ini.");
      return;
    }

    // Validasi 3: Pastikan hari yang aktif memiliki minimal 1 pilihan jam
    const hasEmptyTimes = activeDays.some((day) => day.times.length === 0);
    if (hasEmptyTimes) {
      alert("Ada hari kerja yang belum Anda tentukan jam ketersediaannya.");
      return;
    }

    alert("Data coach dan Weekly Template berhasil disimpan!");
    navigate("/admin/pengguna");
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-8">
        <button
          type="button"
          onClick={() => navigate("/admin/pengguna")}
          className="w-10 h-10 bg-pure-white border border-soft-border rounded-full flex items-center justify-center text-muted-gray hover:text-primary hover:border-primary transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-deep-slate">
            Tambah Coach Baru
          </h1>
          <p className="text-muted-gray mt-1">
            Masukkan profil, layanan, kelas, dan pola jadwal mingguan pelatih.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSimpan} className="space-y-8">
          {/* Section 1: Informasi Dasar */}
          <div>
            <h3 className="text-lg font-bold text-deep-slate mb-4 border-b border-soft-border pb-2">
              1. Informasi Dasar
            </h3>
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Nama Lengkap Coach
              </label>
              <input
                type="text"
                placeholder="Contoh: Coach Fika"
                required
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          </div>

          {/* Section 2: Layanan */}
          <div>
            <h3 className="text-lg font-bold text-deep-slate mb-4 border-b border-soft-border pb-2">
              2. Layanan yang Ditangani
            </h3>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 font-medium text-deep-slate cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary rounded border-soft-border focus:ring-primary cursor-pointer"
                />
                <span>Personal Training (1:1)</span>
              </label>
              <label className="flex items-center gap-2 font-medium text-deep-slate cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary rounded border-soft-border focus:ring-primary cursor-pointer"
                />
                <span>Couple/Duo Training</span>
              </label>
              <label className="flex items-center gap-2 font-medium text-deep-slate cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary rounded border-soft-border focus:ring-primary cursor-pointer"
                />
                <span>Group Class</span>
              </label>
            </div>
          </div>

          {/* Section 3: Spesialisasi Kelas */}
          <div>
            <h3 className="text-lg font-bold text-deep-slate mb-4 border-b border-soft-border pb-2">
              3. Kelas Spesialisasi
            </h3>
            <p className="text-sm text-muted-gray mb-4">
              Pilih kelas apa saja yang berhak diajarkan oleh coach ini.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-clean-bg p-5 rounded-2xl border border-soft-border/50">
              {daftarKelas.map((kelas, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 text-primary rounded border-soft-border focus:ring-primary cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-deep-slate group-hover:text-primary transition-colors leading-snug">
                    {kelas}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Template Jadwal Mingguan */}
          <div>
            <div className="mb-6 border-b border-soft-border pb-2">
              <h3 className="text-lg font-bold text-deep-slate">
                4. Ketersediaan Jadwal (Weekly Template)
              </h3>
              <p className="text-sm text-muted-gray mt-1">
                Tentukan rentang kontrak dan pola hari kerja rutin coach.
              </p>
            </div>

            {/* 4A: Periode Berlaku */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-deep-slate mb-2">
                  Jadwal Mulai Berlaku
                </label>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) =>
                    handlePeriodChange("startDate", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-deep-slate font-medium"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-deep-slate mb-2">
                  Berlaku Sampai Dengan
                </label>
                <input
                  type="date"
                  value={period.endDate}
                  min={period.startDate}
                  onChange={(e) =>
                    handlePeriodChange("endDate", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-deep-slate font-medium"
                />
              </div>
            </div>

            {/* 4B: Pola Hari Mingguan */}
            <label className="block text-sm font-semibold text-deep-slate mb-3">
              Pola Hari & Jam Tersedia
            </label>
            <div className="space-y-4">
              {weeklySchedule.map((dayObj, index) => (
                <div
                  key={dayObj.day}
                  className={`border rounded-2xl p-5 transition-colors ${dayObj.isActive ? "border-primary bg-primary/5" : "border-soft-border bg-pure-white"}`}>
                  {/* Header Hari (Toggle) */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={dayObj.isActive}
                        onChange={() => handleDayToggle(index)}
                        className="w-5 h-5 text-primary rounded border-soft-border focus:ring-primary cursor-pointer"
                      />
                      <span
                        className={`text-base font-bold transition-colors ${dayObj.isActive ? "text-primary" : "text-muted-gray group-hover:text-deep-slate"}`}>
                        Setiap Hari {dayObj.day}
                      </span>
                    </label>
                    <span className="text-sm font-semibold text-muted-gray">
                      {dayObj.isActive
                        ? dayObj.times.length > 0
                          ? `${dayObj.times.length} Slot Dipilih`
                          : "Pilih Jam ↓"
                        : "Libur"}
                    </span>
                  </div>

                  {/* Pilihan Jam (Muncul jika hari dicentang) */}
                  {dayObj.isActive && (
                    <div className="mt-4 pt-4 border-t border-primary/20 animate-in fade-in duration-200">
                      <div className="flex flex-wrap gap-2">
                        {jamOperasional.map((jam) => {
                          const isSelected = dayObj.times.includes(jam);
                          return (
                            <button
                              key={jam}
                              type="button"
                              onClick={() => handleTimeToggle(index, jam)}
                              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                                isSelected
                                  ? "bg-primary border-primary text-pure-white shadow-sm"
                                  : "bg-pure-white border-soft-border text-muted-gray hover:border-primary hover:text-primary"
                              }`}>
                              {jam}
                            </button>
                          );
                        })}
                      </div>
                      {dayObj.times.length === 0 && (
                        <p className="text-xs text-orange-500 mt-2 font-medium">
                          Pilih minimal satu jam untuk hari {dayObj.day}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-soft-border pt-6 flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => navigate("/admin/pengguna")}
              className="px-8 py-3.5 bg-transparent border-2 border-soft-border text-deep-slate hover:border-deep-slate rounded-xl font-bold transition-all">
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3.5 bg-deep-slate hover:bg-primary text-pure-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Simpan Coach
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
