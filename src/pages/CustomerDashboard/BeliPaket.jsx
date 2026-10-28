import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";

export default function BeliPaket() {
  const navigate = useNavigate();
  const [step, setStep] = useState("catalog"); // 'catalog' | 'checkout' | 'success'
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");

  const availablePackages = [
    {
      id: "PKG-001",
      name: "12 Sesi Group Class",
      price: 450000,
      quota: 12,
      validityDays: 30,
      category: "Group Class",
      description:
        "Akses fleksibel ke seluruh kelas grup (Zumba, Yoga, Poundfit, Suspension) yang dijadwalkan.",
      benefits: [
        "Akses Loker & Shower",
        "Bebas pilih kelas harian",
        "Gratis handuk",
      ],
    },
    {
      id: "PKG-002",
      name: "8 Sesi Personal Training",
      price: 1200000,
      quota: 8,
      validityDays: 30,
      category: "Personal Training",
      description:
        "Latihan intensif 1-on-1 dengan Coach profesional bersertifikat untuk mencapai target spesifik Anda.",
      benefits: [
        "Konsultasi nutrisi mingguan",
        "Pengukuran InBody",
        "Prioritas alat",
        "Akses gym di luar sesi PT",
      ],
    },
    {
      id: "PKG-003",
      name: "Paket Hemat 4 Sesi",
      price: 180000,
      quota: 4,
      validityDays: 14,
      category: "Group Class",
      description:
        "Cocok untuk Anda yang ingin mencoba kelas dengan komitmen singkat.",
      benefits: ["Akses Loker & Shower", "Pilih 4 kelas grup apa saja"],
    },
  ];

  const formatRupiah = (number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const handleCheckout = (pkg) => {
    setSelectedPackage(pkg);
    setStep("checkout");
  };

  const handlePayment = () => {
    setStep("success");
    // Otomatis kembali ke halaman paket setelah sukses
    setTimeout(() => {
      navigate("/customer/paket");
    }, 2500);
  };

  return (
    <div className="animate-in fade-in duration-300">
      {/* TAMPILAN 1: KATALOG PAKET */}
      {step === "catalog" && (
        <>
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => navigate("/customer/paket")}
              className="p-2 bg-clean-bg rounded-xl hover:bg-soft-border transition-colors text-deep-slate">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-deep-slate">
                Pilih Paket Latihan
              </h1>
              <p className="text-muted-gray mt-1">
                Jelajahi opsi layanan yang sesuai dengan target kebugaran Anda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {availablePackages.map((pkg) => (
              <Card
                key={pkg.id}
                className="flex flex-col h-full border-t-4 border-t-primary hover:shadow-lg transition-all">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-gray bg-clean-bg px-2.5 py-1 rounded-md border border-soft-border self-start mb-4">
                  {pkg.category}
                </span>
                <h3 className="text-2xl font-bold text-deep-slate mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-muted-gray mb-6 h-10">
                  {pkg.description}
                </p>
                <div className="text-4xl font-black text-primary mb-6">
                  {formatRupiah(pkg.price)}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 bg-clean-bg rounded-lg p-3 text-center border border-soft-border">
                    <p className="text-[10px] font-bold uppercase text-muted-gray">
                      Kuota Sesi
                    </p>
                    <p className="text-lg font-bold text-deep-slate">
                      {pkg.quota}
                    </p>
                  </div>
                  <div className="flex-1 bg-clean-bg rounded-lg p-3 text-center border border-soft-border">
                    <p className="text-[10px] font-bold uppercase text-muted-gray">
                      Masa Aktif
                    </p>
                    <p className="text-lg font-bold text-deep-slate">
                      {pkg.validityDays} Hari
                    </p>
                  </div>
                </div>

                <div className="flex-1 mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-deep-slate mb-3">
                    Fasilitas Termasuk:
                  </p>
                  <ul className="space-y-2">
                    {pkg.benefits.map((benefit, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm font-semibold text-muted-gray">
                        <svg
                          className="w-4 h-4 text-green-500 mt-0.5 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"></path>
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleCheckout(pkg)}
                  className="w-full py-3 bg-pure-white border-2 border-primary text-primary hover:bg-primary hover:text-pure-white rounded-xl font-bold transition-all mt-auto">
                  Pilih Paket Ini
                </button>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* TAMPILAN 2: HALAMAN CHECKOUT */}
      {step === "checkout" && selectedPackage && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => setStep("catalog")}
              className="p-2 bg-clean-bg rounded-xl hover:bg-soft-border transition-colors text-deep-slate">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-deep-slate">
                Selesaikan Pembayaran
              </h1>
              <p className="text-muted-gray mt-1">
                Detail pesanan dan pilihan metode pembayaran Anda.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3 space-y-6">
              <Card>
                <h2 className="text-lg font-bold text-deep-slate mb-4">
                  Pilih Metode Pembayaran
                </h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "bca" ? "border-primary bg-primary/5" : "border-soft-border hover:border-primary/50"}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-blue-100 rounded text-xs font-bold text-blue-700 flex items-center justify-center">
                        BCA
                      </div>
                      <div>
                        <p className="font-bold text-deep-slate">
                          Transfer Virtual Account BCA
                        </p>
                        <p className="text-xs text-muted-gray mt-0.5">
                          Otomatis dicek oleh sistem
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={paymentMethod === "bca"}
                      onChange={() => setPaymentMethod("bca")}
                      className="w-5 h-5 text-primary"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === "qris" ? "border-primary bg-primary/5" : "border-soft-border hover:border-primary/50"}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-8 bg-red-100 rounded text-xs font-bold text-red-600 flex items-center justify-center">
                        QRIS
                      </div>
                      <div>
                        <p className="font-bold text-deep-slate">Scan QRIS</p>
                        <p className="text-xs text-muted-gray mt-0.5">
                          Gopay, OVO, Dana, ShopeePay
                        </p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      checked={paymentMethod === "qris"}
                      onChange={() => setPaymentMethod("qris")}
                      className="w-5 h-5 text-primary"
                    />
                  </label>
                </div>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="sticky top-28 border-t-4 border-t-primary">
                <h2 className="text-lg font-bold text-deep-slate mb-4">
                  Ringkasan Pesanan
                </h2>
                <div className="border-b border-soft-border pb-4 mb-4">
                  <h3 className="font-bold text-deep-slate">
                    {selectedPackage.name}
                  </h3>
                  <p className="text-sm font-semibold text-muted-gray mt-1">
                    {selectedPackage.category}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm font-semibold text-deep-slate">
                    <span>Kuota didapat</span>
                    <span>{selectedPackage.quota} Sesi</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-deep-slate">
                    <span>Masa Aktif</span>
                    <span>{selectedPackage.validityDays} Hari</span>
                  </div>
                </div>

                <div className="border-t border-soft-border pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-deep-slate">
                      Total Pembayaran
                    </span>
                    <span className="text-xl font-black text-primary">
                      {formatRupiah(selectedPackage.price)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={!paymentMethod}
                  className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-md ${paymentMethod ? "bg-primary text-pure-white hover:bg-opacity-90" : "bg-muted-gray/30 text-muted-gray cursor-not-allowed"}`}>
                  Bayar Sekarang
                </button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAMPILAN 3: SUKSES */}
      {step === "success" && (
        <div className="max-w-xl mx-auto mt-20 text-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full mx-auto flex items-center justify-center mb-6">
            <svg
              className="w-12 h-12"
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
          <h2 className="text-3xl font-bold text-deep-slate mb-3">
            Pembayaran Berhasil!
          </h2>
          <p className="text-muted-gray mb-8">
            Paket Anda telah aktif. Anda akan dialihkan kembali ke halaman Kuota
            secara otomatis...
          </p>
        </div>
      )}
    </div>
  );
}
