import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function PublicFooter() {
  const year = 2026;

  return (
    <footer className="border-t border-[#E2E8F0] bg-white text-[#1E293B]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <a href="#beranda" className="inline-flex items-center gap-2.5">
              <div className="relative h-9 w-9">
                <Image
                  src="/logo-gymnasyum.webp"
                  alt="Logo Gymnasyum"
                  fill
                  sizes="36px"
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-[#1E293B]">
                Gymnasyum
              </span>
            </a>
            <p className="text-sm leading-relaxed text-[#64748B]">
              Latihan nyaman bersama coach pribadi dengan manajemen kuota
              transparan dan pindah jadwal praktis lewat asisten chat.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E293B]">
              Navigasi
            </h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-[#64748B]">
              <li>
                <a
                  href="#layanan"
                  className="transition-colors hover:text-[#1E293B]">
                  Layanan & Audiens
                </a>
              </li>
              <li>
                <a
                  href="#keunggulan"
                  className="transition-colors hover:text-[#1E293B]">
                  Keunggulan
                </a>
              </li>
              <li>
                <a
                  href="#cara-kerja"
                  className="transition-colors hover:text-[#1E293B]">
                  Cara Kerja
                </a>
              </li>
              <li>
                <a
                  href="#paket"
                  className="transition-colors hover:text-[#1E293B]">
                  Harga Paket
                </a>
              </li>
            </ul>
                  </div>
          
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E293B]">
              Akun
            </h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-[#64748B]">
              <li>
                <Link
                  href="/login"
                  className="transition-colors hover:text-[#1E293B]">
                  Masuk Member
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="transition-colors hover:text-[#1E293B]">
                  Daftar Akun Baru
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1E293B]">
              Mitra Resmi
            </h3>
            <ul className="mt-4 space-y-2.5 text-[15px] text-[#64748B]">
              <li>
                <a
                  href="https://gymnasyum.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#1E293B]">
                  gymnasyum.id
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/gymnasyum.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#1E293B]">
                  @gymnasyum.id
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[#E2E8F0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#64748B]">
          <p>&copy; {year} Gymnasyum. Seluruh hak cipta dilindungi.</p>
          <p>Smart Reschedule Assistant</p>
        </div>
      </div>
    </footer>
  );
}
