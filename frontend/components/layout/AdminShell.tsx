"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Calendar,
  Folder,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { isOpen, toggle, close } = useSidebarStore();
  const pathname = usePathname();

  const menuItems = [
    { href: "/admin", label: "Validasi Reschedule", icon: LayoutDashboard },
    { href: "/admin/jadwal", label: "Jadwal & Coach", icon: Calendar },
    { href: "/admin/pengguna", label: "Data Pengguna", icon: Users },
    { href: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
    { href: "/admin/katalog", label: "Katalog Layanan", icon: Folder },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#1E293B]">
      {/* Overlay Sidebar Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={close}
        />
      )}

      {/* Sidebar Kiri */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E2E8F0] 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-sm lg:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* 1. Area Logo Gymnasyum (Paling Atas) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0] shrink-0">
          <Link
            href="/admin"
            className="flex items-center gap-2"
            onClick={close}>
            <div className="relative w-8 h-8">
              <Image
                src="/logo-gymnasyum.webp"
                alt="Logo Gymnasyum"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold text-[#65C466] tracking-tight">
              Gymnasyum
            </span>
          </Link>
          <button
            onClick={close}
            className="lg:hidden text-[#64748B] hover:text-[#1E293B]">
            <X size={20} />
          </button>
        </div>

        {/* 2. Blok Profil, Setting, & Logout (Di Antara Logo & Menu) */}
        <div className="px-4 pt-5 pb-2 shrink-0">
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
            {/* Info User */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#65C466]/20 flex items-center justify-center text-[#65C466] font-bold text-sm border border-[#65C466]/30 shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-[#1E293B] truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-[#64748B] capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex gap-2">
              <Link
                href="/admin/profil"
                onClick={close}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-gray-50 transition-colors shadow-sm">
                <Settings size={14} />
                <span>Akun</span>
              </Link>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-red-100 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors shadow-sm">
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Daftar Menu Navigasi Utama */}
        <nav className="flex-1 overflow-y-auto pt-2 pb-6 px-3 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`
                  relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#65C466]/10 text-[#65C466] font-semibold"
                      : "text-[#64748B] hover:bg-gray-50 hover:text-[#1E293B] font-medium"
                  }
                `}>
                {/* Garis Indikator Penanda Menu Aktif */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/5 bg-[#65C466] rounded-r-full shadow-sm" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Area Konten Utama (Kanan) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Header (Hanya muncul di Mobile untuk tombol menu, disembunyikan di Desktop) */}
        <header className="lg:hidden h-16 bg-white border-b border-[#E2E8F0] flex items-center px-4 shrink-0 z-30">
          <button
            onClick={toggle}
            className="text-[#64748B] p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-lg text-[#1E293B] ml-2">
            Menu Dasbor
          </span>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
