import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { users } from "../../data/authData"; // Mengambil data dummy

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault(); // Mencegah halaman refresh saat tombol ditekan
    setError("");

    // Mencari kecocokan email dan password pada data dummy
    const foundUser = users.find(
      (u) => u.email === email && u.password === password,
    );

    if (foundUser) {
      // Menyimpan data user ke local storage browser sebagai simulasi session
      localStorage.setItem("gym_user", JSON.stringify(foundUser));

      // Arahkan ke dashboard yang sesuai
      if (foundUser.role === "customer") {
        navigate("/customer");
      } else if (foundUser.role === "admin") {
        navigate("/admin"); // Rute ini disiapkan untuk nanti
      }
    } else {
      setError("Email atau kata sandi tidak valid.");
    }
  };

  return (
    <div className="min-h-screen flex bg-clean-bg">
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/bg-gymnasyum.webp')" }}>
        <div className="absolute inset-0 bg-deep-slate/80"></div>
        <div className="relative z-10 text-center px-12">
          <img
            src="/logo-gymnasyum.webp"
            alt="Logo"
            className="w-24 h-24 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-pure-white mb-4">
            Selamat Datang Kembali
          </h1>
          <p className="text-soft-border text-lg">
            Kelola jadwal latihan Anda dengan Smart Reschedule Assistant dari
            Gymnasyum.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 sm:px-16 lg:px-24 bg-pure-white">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-deep-slate mb-2">
            Masuk ke Akun
          </h2>
          <p className="text-muted-gray mb-6">
            Silakan masukkan email dan kata sandi Anda.
          </p>

          {/* Menampilkan pesan error jika login gagal */}
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm font-medium mb-4 border border-red-100">
              {error}
            </div>
          )}

          {/* Form dipasangkan ke event onSubmit */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@gmail.com"
                required
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-deep-slate mb-2">
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-5 py-3.5 rounded-xl border border-soft-border bg-clean-bg focus:bg-pure-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-deep-slate font-medium">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary rounded border-soft-border focus:ring-primary"
                />
                Ingat Saya
              </label>
              <a
                href="#"
                className="font-semibold text-primary hover:text-deep-slate transition-colors">
                Lupa sandi?
              </a>
            </div>

            {/* Ubah type="button" menjadi type="submit" agar onSubmit di form terpanggil */}
            <button
              type="submit"
              className="w-full bg-deep-slate hover:bg-primary text-pure-white py-3.5 rounded-xl font-bold text-lg transition-all shadow-md">
              Masuk
            </button>
          </form>

          <p className="text-center text-muted-gray mt-8 font-medium">
            Belum punya akun?{" "}
            {/* Gunakan komponen Link dari react-router-dom */}
            <Link
              to="/register"
              className="text-primary font-bold hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
