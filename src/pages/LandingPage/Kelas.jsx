export default function Kelas() {
  const classData = [
    {
      id: 1,
      title: "PUSH DAY",
      target: "Open to all",
      duration: "60 mins",
      desc: "Mau tubuhmu lebih kuat dan terlihat lebih estetik? Yuk latihan bareng coach Gymnasyum yang satu ini.",
      image: "/bg-gymnasyum.webp",
    },
    {
      id: 2,
      title: "UPPER BODY & CORE SCULPT",
      target: "Woman Only",
      duration: "60 mins",
      desc: "Kelas ini dirancang khusus untuk perempuan yang ingin membentuk dan mengencangkan area lengan, bahu, punggung, dada, serta otot perut.",
      image: "/bg-gymnasyum.webp",
    },
    {
      id: 3,
      title: "CALISTHENIC NIGHT",
      target: "Open to all",
      duration: "60 mins",
      desc: "Kelas yang dikhususkan untuk para worker yang hanya memiliki kesempatan berlatih di malam hari. Mari lepaskan penat dengan gerakan tubuh.",
      image: "/bg-gymnasyum.webp",
    },
  ];

  return (
    <section id="kelas" className="py-24 bg-clean-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header & Area Filter */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-deep-slate tracking-tight">
            Program Kelas
          </h2>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto">
              <option>Semua Tipe Kelas</option>
              <option>Strength</option>
              <option>Cardio</option>
            </select>
            <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto">
              <option>Semua Kategori</option>
              <option>Woman Only</option>
              <option>Open to all</option>
            </select>
            <select className="px-4 py-2.5 border border-soft-border rounded-xl bg-pure-white text-deep-slate font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-auto">
              <option>Semua Level</option>
              <option>Pemula</option>
              <option>Menengah</option>
            </select>
          </div>
        </div>

        {/* Grid Card Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classData.map((item) => (
            <div
              key={item.id}
              className="bg-pure-white rounded-2xl overflow-hidden shadow-sm border border-soft-border flex flex-col transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="relative h-56 flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-deep-slate/60"></div>
                <h3 className="relative z-10 text-2xl font-bold text-pure-white text-center px-4 tracking-wide">
                  {item.title}
                </h3>
              </div>

              <div className="p-6 flex flex-col flex-grow">
                <h4 className="text-xl font-bold text-deep-slate mb-3">
                  {item.title}
                </h4>
                <div className="flex items-center gap-5 text-sm font-semibold text-muted-gray mb-4">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {item.duration}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    {item.target}
                  </span>
                </div>
                <p className="text-muted-gray mb-8 flex-grow leading-relaxed">
                  {item.desc}
                </p>
                <button className="w-full bg-deep-slate hover:bg-primary text-pure-white py-3 rounded-xl font-semibold transition-colors">
                  View More
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
