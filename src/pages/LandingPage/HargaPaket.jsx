export default function HargaPaket() {
  // Data paket harga yang dikelompokkan
  const pricingCategories = [
    {
      id: "group-class",
      title: "Paket Group Class Regular",
      desc: "Paket Group Class Regular menyediakan kredit untuk melakukan sesi latihan dengan group class. Group class sendiri akan dipandu oleh coach.",
      packages: [
        {
          id: 1,
          name: "4 Sesi Group Class",
          oldPrice: "Rp640,000",
          price: "Rp600,000",
          features: [
            "Pembayaran satu kali",
            "4 kredit untuk kelas",
            "Berlaku selama 45 hari sejak tanggal pemesanan pertama",
            "Tidak dapat dibagikan",
            "Masa berlaku dimulai meski tidak ada pemesanan setelah 1 minggu",
          ],
        },
        {
          id: 2,
          name: "8 Sesi Group Class",
          oldPrice: "Rp1,280,000",
          price: "Rp1,200,000",
          features: [
            "Pembayaran satu kali",
            "8 kredit untuk kelas",
            "Berlaku selama 45 hari sejak tanggal pemesanan pertama",
            "Tidak dapat dibagikan",
            "Masa berlaku dimulai meski tidak ada pemesanan setelah 1 minggu",
          ],
        },
        {
          id: 3,
          name: "12 Sesi Group Class",
          oldPrice: "Rp1,960,000",
          price: "Rp1,800,000",
          features: [
            "Pembayaran satu kali",
            "12 kredit untuk kelas",
            "Berlaku selama 60 hari sejak tanggal pemesanan pertama",
            "Tidak dapat dibagikan",
            "Masa berlaku dimulai meski tidak ada pemesanan setelah 1 minggu",
          ],
        },
      ],
    },
    {
      id: "pt-couple",
      title: "Paket 8 Sesi PT (1:1) dan Couple/Duo Training",
      desc: "Paket latihan dengan jumlah 8 sesi untuk personal dan couple/duo bersama junior coach, advanced coach, hingga head coach.",
      packages: [
        {
          id: 4,
          name: "8 Sesi Couple - Head Coach",
          oldPrice: null,
          price: "Rp5,500,000",
          features: [
            "One time payment",
            "8 credits for Classes",
            "Location access: Gymnasyum Bintaro",
            "Valid for 45 days from date of first booking",
          ],
        },
        {
          id: 5,
          name: "8 Sesi PT (1:1) - Junior Coach",
          oldPrice: null,
          price: "Rp3,200,000",
          features: [
            "One time payment",
            "8 credits for Classes",
            "Location access: Gymnasyum Bintaro",
            "Valid for 45 days from date of first booking",
          ],
        },
        {
          id: 6,
          name: "8 Sesi Couple - Junior Coach",
          oldPrice: null,
          price: "Rp4,400,000",
          features: [
            "One time payment",
            "8 credits for Classes",
            "Location access: Gymnasyum Bintaro",
            "Valid for 45 days from date of first booking",
          ],
        },
      ],
    },
  ];

  return (
    // Background pure-white untuk memberi kontras dengan bagian Event (clean-bg)
    <section id="harga" className="py-24 bg-pure-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-deep-slate tracking-tight mb-16 text-center md:text-left">
          Harga Paket
        </h2>

        {/* Melakukan mapping untuk setiap kategori harga */}
        {pricingCategories.map((category, index) => (
          <div
            key={category.id}
            className={`flex flex-col lg:flex-row gap-10 lg:gap-16 ${
              index !== pricingCategories.length - 1 ? "mb-24" : ""
            }`}>
            {/* Sisi Kiri: Deskripsi Sticky */}
            <div className="lg:w-1/3 shrink-0 relative">
              <div className="sticky top-32">
                <h3 className="text-2xl font-bold text-deep-slate mb-4 leading-snug">
                  {category.title}
                </h3>
                <p className="text-muted-gray text-lg leading-relaxed">
                  {category.desc}
                </p>
              </div>
            </div>

            {/* Sisi Kanan: Grid Cards */}
            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {category.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-clean-bg border border-soft-border rounded-3xl p-6 flex flex-col hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <h4 className="text-lg font-bold text-deep-slate mb-4 h-14">
                    {pkg.name}
                  </h4>

                  <div className="mb-6">
                    {pkg.oldPrice && (
                      <p className="text-muted-gray line-through text-sm mb-1">
                        {pkg.oldPrice}
                      </p>
                    )}
                    <p className="text-2xl font-extrabold text-primary">
                      {pkg.price}
                    </p>
                  </div>

                  {/* Kotak Fitur / Syarat Ketentuan */}
                  <div className="bg-pure-white rounded-2xl p-5 mb-8 flex-grow border border-soft-border/50">
                    <ul className="space-y-4">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-primary shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2.5"
                              d="M5 13l4 4L19 7"></path>
                          </svg>
                          <span className="text-sm font-medium text-deep-slate leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <p className="text-sm text-center text-muted-gray font-semibold cursor-pointer hover:text-primary transition-colors">
                      Quick View
                    </p>
                    <button className="w-full bg-deep-slate hover:bg-primary text-pure-white py-3.5 rounded-full font-semibold transition-colors">
                      Beli Sekarang
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
