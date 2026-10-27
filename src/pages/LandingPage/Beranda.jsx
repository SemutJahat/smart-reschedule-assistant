import Navbar from "../../components/Navbar";
import ScrollButton from "../../components/ScrollButton";
import Kelas from "./Kelas";
import Event from "./Event";
import HargaPaket from "./HargaPaket";
import Penjadwalan from "./Penjadwalan";

export default function Beranda() {
  return (
    // Tambahkan div pembungkus utama ini agar Navbar dan Main sejajar
    <div className="min-h-screen flex flex-col bg-clean-bg">
      {/* Panggil komponen Navbar di sini */}
      <Navbar />

      <main className="flex-grow relative">
        {/* Hero Section */}
        <div
          className="relative w-full h-[550px] flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}>
          <div className="absolute inset-0 bg-deep-slate/70"></div>
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-[-50px]">
            <h1 className="text-4xl md:text-5xl font-bold text-pure-white leading-tight mb-6 tracking-tight">
              Wujudkan Gaya Hidup Sehat Anda Bersama Gymnasyum
            </h1>
            <p className="text-lg text-soft-border mb-10 max-w-2xl mx-auto font-medium">
              Fasilitas premium, pelatih profesional, dan kemudahan manajemen
              jadwal yang dirancang khusus untuk kenyamanan Anda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-primary hover:opacity-90 text-pure-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all shadow-lg">
                Mulai Sekarang
              </button>
              <button className="bg-transparent hover:bg-pure-white/10 border-2 border-pure-white text-pure-white px-8 py-3.5 rounded-full font-semibold text-lg transition-all">
                Lihat Jadwal
              </button>
            </div>
          </div>
        </div>

        {/* Section Tentang Gymnasyum */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="rounded-[2rem] overflow-hidden shadow-md h-[450px]">
              <img
                src="/bg-gymnasyum.webp"
                alt="Logo Gymnasyum di Dinding"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-deep-slate mb-3">
                Tentang Gymnasyum
              </h2>
              <p className="text-lg font-semibold text-primary mb-8">
                "sehat dan kuat, dunia akhirat"
              </p>
              <div className="text-muted-gray space-y-5 text-[1.05rem] leading-relaxed">
                <p>Gymnasyum adalah gabungan dari 3 kata:</p>
                <ul className="list-disc pl-6 space-y-2 font-medium">
                  <li>
                    <strong className="text-deep-slate">GYM</strong> yang
                    berarti pusat kebugaran
                  </li>
                  <li>
                    <strong className="text-deep-slate">NASYI'</strong> yang
                    berarti tumbuh
                  </li>
                  <li>
                    <strong className="text-deep-slate">UM</strong> dari kata
                    ummah
                  </li>
                </ul>
                <p>
                  Sehingga ada makna yang tersirat berupa doa agar Gymnasyum
                  menjadi gym tempat berlatih dan bertumbuhnya ummat.
                </p>
                <p>
                  Di sisi lain pengucapan gymnasyum sendiri sama seperti kata
                  gymnasium yang berarti tempat untuk berlatih olahraga.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Komponen-komponen tambahan */}
        <Kelas />
        <Event />
        <HargaPaket />
        <Penjadwalan />
        <ScrollButton />
      </main>
    </div>
  );
}
