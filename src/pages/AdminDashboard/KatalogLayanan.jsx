import { useState } from "react";
import Card from "../../components/Card";

export default function KatalogLayanan() {
  // Data simulasi Katalog Layanan (Paket)
  const [packages, setPackages] = useState([
    {
      id: "PKG-001",
      name: "12 Sesi Group Class",
      category: "Group Class",
      price: 450000,
      quota: 12,
      validityDays: 30,
      status: "Aktif",
    },
    {
      id: "PKG-002",
      name: "8 Sesi Personal Training",
      category: "Personal Training",
      price: 1200000,
      quota: 8,
      validityDays: 30,
      status: "Aktif",
    },
    {
      id: "PKG-003",
      name: "Unlimited Gym Access",
      category: "Membership",
      price: 250000,
      quota: 999, // 999 = representasi unlimited
      validityDays: 30,
      status: "Diarsipkan", // Nonaktif, tidak bisa dibeli
    },
  ]);

  // State Manajemen Modal Multi-Tahap (CRUD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState("form"); // 'form' | 'success'
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'

  // State Form
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category: "Group Class",
    price: "",
    quota: "",
    validityDays: 30,
    status: "Aktif",
  });

  // Fungsi utilitas format Rupiah
  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  // Handler Buka Modal Tambah
  const handleOpenAdd = () => {
    setModalMode("add");
    setFormData({
      id: "",
      name: "",
      category: "Group Class",
      price: "",
      quota: "",
      validityDays: 30,
      status: "Aktif",
    });
    setModalStep("form");
    setIsModalOpen(true);
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (pkg) => {
    setModalMode("edit");
    setFormData({ ...pkg });
    setModalStep("form");
    setIsModalOpen(true);
  };

  // Handler Tutup Modal
  const handleCloseModal = () => {
    if (modalStep === "success") return;
    setIsModalOpen(false);
    setTimeout(() => setModalStep("form"), 300);
  };

  // Handler Submit Form (Simpan/Update Data)
  const handleSubmit = (e) => {
    e.preventDefault();

    if (modalMode === "add") {
      const newPackage = {
        ...formData,
        id: `PKG-00${packages.length + 1}`,
        price: Number(formData.price),
        quota: Number(formData.quota),
        validityDays: Number(formData.validityDays),
      };
      setPackages([...packages, newPackage]);
    } else {
      setPackages(
        packages.map((p) =>
          p.id === formData.id
            ? {
                ...formData,
                price: Number(formData.price),
                quota: Number(formData.quota),
                validityDays: Number(formData.validityDays),
              }
            : p,
        ),
      );
    }

    setModalStep("success");

    // Otomatis menutup modal setelah 1.5 detik
    setTimeout(() => {
      setIsModalOpen(false);
      setTimeout(() => setModalStep("form"), 300);
    }, 1500);
  };

  // Handler Ganti Status Cepat (Aktif <-> Diarsipkan)
  const handleToggleStatus = (id) => {
    setPackages(
      packages.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "Aktif" ? "Diarsipkan" : "Aktif" }
          : p,
      ),
    );
  };

  return (
    <div className="animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-slate mb-2">
            Katalog Layanan
          </h1>
          <p className="text-muted-gray">
            Kelola paket kelas, harga, dan kuota yang tersedia untuk pelanggan.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-primary hover:bg-opacity-90 text-pure-white px-5 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M12 4v16m8-8H4"></path>
          </svg>
          Tambah Paket Baru
        </button>
      </div>

      {/* GRID KARTU PAKET */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`flex flex-col h-full transition-all border-t-4 ${pkg.status === "Aktif" ? "border-t-primary" : "border-t-muted-gray opacity-75"}`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-gray bg-clean-bg px-2.5 py-1 rounded-md border border-soft-border">
                {pkg.category}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${pkg.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                {pkg.status}
              </span>
            </div>

            <h3 className="text-xl font-bold text-deep-slate mb-1">
              {pkg.name}
            </h3>
            <p className="text-3xl font-black text-primary mb-6">
              {formatRupiah(pkg.price)}
            </p>

            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center gap-3 text-sm font-semibold text-deep-slate bg-clean-bg p-3 rounded-lg border border-soft-border/50">
                <div className="w-8 h-8 rounded-full bg-pure-white flex items-center justify-center text-primary shadow-sm">
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
                </div>
                <div>
                  <p className="text-xs text-muted-gray">Kuota Sesi</p>
                  <p>
                    {pkg.quota === 999
                      ? "Tanpa Batas (Unlimited)"
                      : `${pkg.quota} Sesi Latihan`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm font-semibold text-deep-slate bg-clean-bg p-3 rounded-lg border border-soft-border/50">
                <div className="w-8 h-8 rounded-full bg-pure-white flex items-center justify-center text-primary shadow-sm">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-gray">Masa Berlaku</p>
                  <p>{pkg.validityDays} Hari Aktif</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-soft-border">
              <button
                onClick={() => handleOpenEdit(pkg)}
                className="flex-1 py-2.5 bg-pure-white border border-soft-border hover:border-primary text-deep-slate hover:text-primary rounded-xl font-bold transition-all text-sm">
                Edit Detail
              </button>
              <button
                onClick={() => handleToggleStatus(pkg.id)}
                className={`py-2.5 px-4 border rounded-xl font-bold transition-all text-sm ${
                  pkg.status === "Aktif"
                    ? "border-orange-200 text-orange-600 hover:bg-orange-50"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
                title={
                  pkg.status === "Aktif" ? "Arsipkan Paket" : "Aktifkan Paket"
                }>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  {pkg.status === "Aktif" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  )}
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* SINGLE DYNAMIC MODAL (ADD / EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-slate/70 backdrop-blur-sm p-4">
          <div className="bg-pure-white rounded-2xl w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* TAHAP 1: FORM */}
            {modalStep === "form" && (
              <>
                <div className="p-6 border-b border-soft-border bg-clean-bg shrink-0 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-deep-slate">
                      {modalMode === "add"
                        ? "Tambah Paket Baru"
                        : "Edit Detail Paket"}
                    </h2>
                    <p className="text-sm text-muted-gray mt-1">
                      Konfigurasi spesifikasi layanan dan aturan masa aktif.
                    </p>
                  </div>
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
                  <form
                    id="packageForm"
                    onSubmit={handleSubmit}
                    className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-deep-slate mb-2">
                        Nama Paket
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Contoh: 10 Sesi Muay Thai"
                        className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary transition-colors font-medium text-deep-slate"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-deep-slate mb-2">
                          Kategori
                        </label>
                        <select
                          required
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary transition-colors font-medium text-deep-slate">
                          <option value="Group Class">Group Class</option>
                          <option value="Personal Training">
                            Personal Training
                          </option>
                          <option value="Membership">
                            Membership / Gym Access
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-deep-slate mb-2">
                          Harga (Rp)
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          placeholder="Contoh: 500000"
                          className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary transition-colors font-medium text-deep-slate"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-deep-slate mb-2">
                          Jumlah Kuota Sesi
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.quota}
                          onChange={(e) =>
                            setFormData({ ...formData, quota: e.target.value })
                          }
                          placeholder="Ketik 999 untuk Unlimited"
                          className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary transition-colors font-medium text-deep-slate"
                        />
                        <p className="text-[10px] font-semibold text-muted-gray mt-1">
                          Gunakan angka 999 untuk akses tak terbatas.
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-deep-slate mb-2">
                          Masa Berlaku (Hari)
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.validityDays}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              validityDays: e.target.value,
                            })
                          }
                          placeholder="Contoh: 30"
                          className="w-full px-4 py-3 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary transition-colors font-medium text-deep-slate"
                        />
                      </div>
                    </div>
                  </form>
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
                    form="packageForm"
                    className="px-6 py-2.5 bg-primary hover:bg-opacity-90 text-pure-white rounded-xl font-bold transition-all shadow-md">
                    {modalMode === "add"
                      ? "Simpan Layanan Baru"
                      : "Simpan Perubahan"}
                  </button>
                </div>
              </>
            )}

            {/* TAHAP 2: SUKSES (Transisi Instan) */}
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
                  Penyimpanan Berhasil!
                </h2>
                <p className="text-muted-gray">
                  Katalog layanan telah diperbarui dan langsung tersedia di
                  sistem.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
