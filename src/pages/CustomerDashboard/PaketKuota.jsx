import { useNavigate } from "react-router-dom";
import Card from "../../components/Card";

export default function PaketKuota() {
  const navigate = useNavigate();

  const activePackage = {
    id: "SUB-0991",
    name: "12 Sesi Group Class",
    category: "Group Class",
    totalSessions: 12,
    usedSessions: 8,
    purchaseDate: "24 Okt 2026",
    expiryDate: "24 Nov 2026",
    status: "Aktif",
  };

  const historyPackages = [
    {
      id: "SUB-0812",
      name: "8 Sesi Personal Training",
      category: "Personal Training",
      purchaseDate: "10 Sep 2026",
      expiryDate: "10 Okt 2026",
      status: "Kedaluwarsa",
    },
    {
      id: "SUB-0750",
      name: "Promo Trial 1 Sesi",
      category: "Trial",
      purchaseDate: "01 Sep 2026",
      expiryDate: "05 Sep 2026",
      status: "Habis Terpakai",
    },
  ];

  const remainingSessions =
    activePackage.totalSessions - activePackage.usedSessions;
  const progressPercentage =
    (activePackage.usedSessions / activePackage.totalSessions) * 100;

  return (
    <div className="animate-in fade-in duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-slate mb-2">
            Paket & Kuota
          </h1>
          <p className="text-muted-gray">
            Pantau sisa sesi latihan dan masa berlaku keanggotaan Anda.
          </p>
        </div>
        <button
          onClick={() => navigate("/customer/beli-paket")}
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
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
          </svg>
          Beli Paket Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Card className="h-full border-t-4 border-t-primary relative overflow-hidden bg-pure-white shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10"></div>
            <div className="flex justify-between items-start mb-6 border-b border-soft-border pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-md mb-3 inline-block">
                  Paket Aktif Saat Ini
                </span>
                <h2 className="text-2xl font-bold text-deep-slate">
                  {activePackage.name}
                </h2>
                <p className="text-sm font-semibold text-muted-gray mt-1">
                  ID Langganan: {activePackage.id}
                </p>
              </div>
            </div>
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-sm font-bold text-deep-slate">
                    Penggunaan Kuota
                  </p>
                  <p className="text-xs font-medium text-muted-gray mt-0.5">
                    Terpakai{" "}
                    <span className="font-bold text-deep-slate">
                      {activePackage.usedSessions}
                    </span>{" "}
                    dari {activePackage.totalSessions} sesi
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-primary">
                    {remainingSessions}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray">
                    Sesi Tersisa
                  </p>
                </div>
              </div>
              <div className="w-full bg-clean-bg rounded-full h-3.5 mb-1 overflow-hidden border border-soft-border/50">
                <div
                  className="bg-primary h-3.5 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-soft-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Tanggal Pembelian
                </p>
                <p className="text-sm font-bold text-deep-slate">
                  {activePackage.purchaseDate}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-gray mb-1">
                  Berlaku Hingga
                </p>
                <p className="text-sm font-bold text-orange-500">
                  {activePackage.expiryDate}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full bg-clean-bg border border-soft-border shadow-none flex flex-col justify-center">
            <div className="w-12 h-12 bg-pure-white rounded-full flex items-center justify-center text-primary shadow-sm mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-deep-slate mb-2">
              Informasi Kuota
            </h3>
            <ul className="space-y-3 text-sm font-medium text-muted-gray">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>Sesi yang tidak
                digunakan setelah tanggal kedaluwarsa akan hangus.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>Pembatalan kelas
                &lt; 6 jam tetap memotong kuota sesi Anda.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>Beli paket baru
                sebelum masa aktif habis untuk akumulasi kuota.
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <h2 className="text-xl font-bold text-deep-slate mb-4">
        Riwayat Pembelian
      </h2>
      <div className="space-y-4">
        {historyPackages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-pure-white border border-soft-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-primary/30 transition-colors">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-base font-bold text-deep-slate">
                  {pkg.name}
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  {pkg.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-gray">
                {pkg.category} • ID: {pkg.id}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs font-bold text-deep-slate mb-0.5">
                {pkg.purchaseDate} - {pkg.expiryDate}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
