import { useState } from 'react';
import { Link } from "react-router-dom";

export default function Navbar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="bg-deep-slate sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Brand */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
            <img
              src="/logo-gymnasyum.webp"
              alt="Gymnasyum Logo"
              className="h-10 w-10"
            />
            <span className="font-bold text-2xl text-pure-white tracking-tight">
              GYMNASYUM
            </span>
          </div>

          {/* Menu Navigasi Utama */}
          <div className="hidden md:flex space-x-8 items-center">
            <a href="" className="text-primary font-semibold">
              Beranda
            </a>
            <a
              href="#kelas"
              className="text-soft-border hover:text-primary transition-colors font-medium">
              Kelas
            </a>
            <a
              href="#event"
              className="text-soft-border hover:text-primary transition-colors font-medium">
              Event
            </a>
            <a
              href="#harga"
              className="text-soft-border hover:text-primary transition-colors font-medium">
              Harga Paket
            </a>
            <a
              href="#jadwal"
              className="text-soft-border hover:text-primary transition-colors font-medium">
              Jadwal Latihan
            </a>

            {/* Dropdown Menu "Lainnya" */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-soft-border hover:text-primary transition-colors font-medium flex items-center gap-1">
                Lainnya
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-pure-white border border-soft-border rounded-lg shadow-xl py-2">
                  <a
                    href="#"
                    className="block px-4 py-2 text-deep-slate hover:bg-clean-bg hover:text-primary transition-colors">
                    Lokasi
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-deep-slate hover:bg-clean-bg hover:text-primary transition-colors">
                    FAQ
                  </a>
                  <a
                    href="#"
                    className="block px-4 py-2 text-deep-slate hover:bg-clean-bg hover:text-primary transition-colors">
                    Merchandise
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Login/Action */}
          <div className="hidden md:flex items-center gap-4">
            <button className="text-pure-white border border-soft-border hover:border-primary hover:text-primary px-6 py-2 rounded-full font-semibold transition-all">
              Hubungi Kami
            </button>
            <Link
              to="/login"
              className="bg-primary hover:opacity-90 text-pure-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-sm">
              Masuk / Daftar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}