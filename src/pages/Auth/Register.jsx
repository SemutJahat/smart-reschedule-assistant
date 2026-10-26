export default function Register() {
  return (
    <div className="min-h-screen flex bg-clean-bg">
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 sm:px-16 lg:px-24 bg-pure-white">
        <div className="w-full max-w-md my-12">
          <h2 className="text-3xl font-bold text-deep-slate mb-2">
            Buat Akun Baru
          </h2>
          <p className="text-muted-gray mb-8">
            Bergabunglah bersama Gymnasyum untuk memulai perjalanan sehat Anda.
          </p>

          <form className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Nama Lengkap
              </label>
              <input
                type="text"
                placeholder="Nama Anda"
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Nomor WhatsApp
              </label>
              <input
                type="tel"
                placeholder="081234567890"
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Email
              </label>
              <input
                type="email"
                placeholder="email@anda.com"
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Kata Sandi
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <button
              type="button"
              className="w-full bg-primary hover:bg-opacity-90 text-pure-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-md mt-4">
              Daftar
            </button>
          </form>

          <p className="text-center text-muted-gray mt-8 font-medium">
            Sudah punya akun?{" "}
            <a
              href="login"
              className="text-deep-slate font-bold hover:text-primary transition-colors">
              Masuk di sini
            </a>
          </p>
        </div>
      </div>

      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}>
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-deep-slate via-transparent to-transparent opacity-90"></div>
        <div className="relative z-10 text-center px-12 mt-auto pb-24">
          <h2 className="text-3xl font-bold text-pure-white mb-3">
            Sehat dan Kuat, Dunia Akhirat
          </h2>
          <p className="text-soft-border text-lg">
            Fasilitas premium dengan lingkungan yang mendukung pertumbuhan Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
