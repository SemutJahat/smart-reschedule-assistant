import { useState } from "react";
import Card from "../../components/Card";

export default function ProfilSaya() {
  // Data simulasi profil pelanggan
  const [profile, setProfile] = useState({
    name: "Andi Darmawan",
    email: "andi.darmawan@email.com",
    phone: "081234567890",
    memberId: "MBR-2026-001",
    joinDate: "15 Jan 2026",
    emergencyContact: "081298765432 (Istri)",
    weight: 72,
    height: 175,
    bloodType: "O",
    medicalHistory: "Tidak ada keluhan",
  });

  // State Manajemen Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(""); // 'editProfile' | 'changePassword'
  const [modalStep, setModalStep] = useState("form"); // 'form' | 'success'

  // State Form Sementara
  const [formData, setFormData] = useState({ ...profile });
  const [passwordData, setPasswordData] = useState({
    old: "",
    new: "",
    confirm: "",
  });

  const handleOpenModal = (type) => {
    setModalType(type);
    setModalStep("form");
    if (type === "editProfile") setFormData({ ...profile });
    if (type === "changePassword")
      setPasswordData({ old: "", new: "", confirm: "" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (modalStep === "success") return;
    setIsModalOpen(false);
    setTimeout(() => setModalStep("form"), 300);
  };

  const handleSubmitProfile = (e) => {
    e.preventDefault();
    setProfile({ ...formData });
    setModalStep("success");
    setTimeout(() => {
      setIsModalOpen(false);
      setTimeout(() => setModalStep("form"), 300);
    }, 1500);
  };

  const handleSubmitPassword = (e) => {
    e.preventDefault();
    // Di aplikasi nyata, tambahkan validasi password di sini
    setModalStep("success");
    setTimeout(() => {
      setIsModalOpen(false);
      setTimeout(() => setModalStep("form"), 300);
    }, 1500);
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-deep-slate mb-2">Profil Saya</h1>
        <p className="text-muted-gray">
          Kelola informasi pribadi, metrik kebugaran, dan keamanan akun Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KOLOM KIRI: KARTU IDENTITAS UTAMA */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="text-center relative overflow-hidden border-t-4 border-t-primary bg-pure-white shadow-sm">
            <div className="absolute top-0 left-0 w-full h-24 bg-primary/5 -z-10"></div>
            <div className="w-24 h-24 bg-primary text-pure-white rounded-full mx-auto flex items-center justify-center text-4xl font-bold shadow-md mb-4 border-4 border-pure-white mt-4">
              {profile.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-bold text-deep-slate mb-1">
              {profile.name}
            </h2>
            <p className="text-sm font-semibold text-muted-gray mb-4">
              {profile.memberId}
            </p>

            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Member Aktif
            </div>

            <div className="border-t border-soft-border pt-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Bergabung Sejak
                </p>
                <p className="text-sm font-bold text-deep-slate">
                  {profile.joinDate}
                </p>
              </div>
              <button
                onClick={() => handleOpenModal("changePassword")}
                className="w-full py-2.5 bg-clean-bg hover:bg-soft-border text-deep-slate rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                Ubah Kata Sandi
              </button>
            </div>
          </Card>
        </div>

        {/* KOLOM KANAN: DETAIL INFORMASI */}
        <div className="lg:col-span-2 space-y-6">
          {/* INFORMASI KONTAK */}
          <Card className="bg-pure-white shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b border-soft-border pb-4">
              <h3 className="text-lg font-bold text-deep-slate flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                Informasi Pribadi & Kontak
              </h3>
              <button
                onClick={() => handleOpenModal("editProfile")}
                className="text-sm font-bold text-primary hover:text-deep-slate transition-colors">
                Edit Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Email
                </p>
                <p className="text-sm font-semibold text-deep-slate bg-clean-bg px-3 py-2 rounded-lg border border-soft-border/50">
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Nomor Telepon / WhatsApp
                </p>
                <p className="text-sm font-semibold text-deep-slate bg-clean-bg px-3 py-2 rounded-lg border border-soft-border/50">
                  {profile.phone}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Kontak Darurat
                </p>
                <p className="text-sm font-semibold text-deep-slate bg-clean-bg px-3 py-2 rounded-lg border border-soft-border/50">
                  {profile.emergencyContact}
                </p>
              </div>
            </div>
          </Card>

          {/* METRIK FISIK */}
          <Card className="bg-pure-white shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b border-soft-border pb-4">
              <h3 className="text-lg font-bold text-deep-slate flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Kondisi Fisik & Medis
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Berat Badan
                </p>
                <p className="text-xl font-bold text-deep-slate">
                  {profile.weight} <span className="text-sm">kg</span>
                </p>
              </div>
              <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Tinggi Badan
                </p>
                <p className="text-xl font-bold text-deep-slate">
                  {profile.height} <span className="text-sm">cm</span>
                </p>
              </div>
              <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  BMI
                </p>
                <p className="text-xl font-bold text-primary">
                  {(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(
                    1,
                  )}
                </p>
              </div>
              <div className="bg-clean-bg p-4 rounded-xl border border-soft-border/50 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Gol. Darah
                </p>
                <p className="text-xl font-bold text-deep-slate">
                  {profile.bloodType}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                Catatan Medis / Cedera Masa Lalu
              </p>
              <p className="text-sm font-semibold text-deep-slate bg-clean-bg px-4 py-3 rounded-lg border border-soft-border/50">
                {profile.medicalHistory}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* SINGLE DYNAMIC MODAL (EDIT PROFIL & UBAH PASSWORD) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/70 backdrop-blur-sm p-4">
          <div className="bg-pure-white rounded-2xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* TAHAP 1: FORM (TERGANTUNG TIPE MODAL) */}
            {modalStep === "form" && (
              <>
                <div className="p-6 border-b border-soft-border bg-clean-bg shrink-0 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-deep-slate">
                    {modalType === "editProfile"
                      ? "Edit Profil & Metrik"
                      : "Ubah Kata Sandi"}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-muted-gray hover:text-red-500 transition-colors">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>

                <div className="p-6 overflow-y-auto">
                  {/* FORM EDIT PROFIL */}
                  {modalType === "editProfile" && (
                    <form
                      id="profileForm"
                      onSubmit={handleSubmitProfile}
                      className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-deep-slate mb-1">
                          Nama Lengkap
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-deep-slate mb-1">
                            Nomor Telepon
                          </label>
                          <input
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-deep-slate mb-1">
                            Kontak Darurat
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.emergencyContact}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                emergencyContact: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 border-t border-soft-border pt-4">
                        <div>
                          <label className="block text-xs font-bold text-deep-slate mb-1">
                            Berat (kg)
                          </label>
                          <input
                            type="number"
                            value={formData.weight}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                weight: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-deep-slate mb-1">
                            Tinggi (cm)
                          </label>
                          <input
                            type="number"
                            value={formData.height}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                height: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-deep-slate mb-1">
                            Gol. Darah
                          </label>
                          <select
                            value={formData.bloodType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                bloodType: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate">
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="AB">AB</option>
                            <option value="O">O</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-deep-slate mb-1">
                          Catatan Medis
                        </label>
                        <textarea
                          rows="2"
                          value={formData.medicalHistory}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              medicalHistory: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"></textarea>
                      </div>
                    </form>
                  )}

                  {/* FORM UBAH PASSWORD */}
                  {modalType === "changePassword" && (
                    <form
                      id="passwordForm"
                      onSubmit={handleSubmitPassword}
                      className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-deep-slate mb-1">
                          Kata Sandi Saat Ini
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordData.old}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              old: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-deep-slate mb-1">
                          Kata Sandi Baru
                        </label>
                        <input
                          type="password"
                          required
                          minLength="8"
                          value={passwordData.new}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              new: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-deep-slate mb-1">
                          Konfirmasi Kata Sandi Baru
                        </label>
                        <input
                          type="password"
                          required
                          minLength="8"
                          value={passwordData.confirm}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirm: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary text-sm font-semibold text-deep-slate"
                        />
                      </div>
                    </form>
                  )}
                </div>

                <div className="p-4 border-t border-soft-border bg-clean-bg flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 bg-pure-white border border-soft-border text-deep-slate hover:bg-soft-border rounded-xl font-bold transition-all">
                    Batal
                  </button>
                  <button
                    type="submit"
                    form={
                      modalType === "editProfile"
                        ? "profileForm"
                        : "passwordForm"
                    }
                    className="px-6 py-2.5 bg-primary hover:bg-opacity-90 text-pure-white rounded-xl font-bold transition-all shadow-md">
                    Simpan Perubahan
                  </button>
                </div>
              </>
            )}

            {/* TAHAP 2: SUKSES */}
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
                  Berhasil Disimpan!
                </h2>
                <p className="text-muted-gray">
                  Data Anda telah berhasil diperbarui di sistem.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
