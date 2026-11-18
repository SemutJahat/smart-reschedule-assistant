// frontend/components/layout/CustomerShell.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { CustomerModalHost } from "@/components/layout/CustomerModalHost";
import {
  Menu,
  X,
  Calendar,
  CalendarPlus,
  ShoppingBag,
  Package,
  LogOut,
  Settings,
} from "lucide-react";

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { isOpen, toggle, close } = useSidebarStore();
  const pathname = usePathname();

  const menuItems = [
    { href: "/customer", label: "Jadwal Saya", icon: Calendar },
    { href: "/customer/pesan-jadwal", label: "Pesan Jadwal", icon: CalendarPlus },
    { href: "/customer/paket", label: "Paket & Kuota", icon: Package },
    { href: "/customer/beli-paket", label: "Beli Paket", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-[#1E293B]">
      {/* Overlay Sidebar Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity cursor-pointer"
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
        {/* 1. Area Logo Gymnasyum (Diperbaiki ukurannya agar proporsional) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8F0] shrink-0">
          <Link
            href="/customer"
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={close}>
            <div className="relative w-9 h-9 flex-shrink-0">
              <Image
                src="/logo-gymnasyum.webp" 
                alt="Logo Gymnasyum"
                fill
                sizes="36px"
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-bold text-[#65C466] tracking-tight">
              Gymnasyum
            </span>
          </Link>
          <button
            onClick={close}
            className="lg:hidden text-[#64748B] hover:text-[#1E293B] cursor-pointer p-1">
            <X size={20} />
          </button>
        </div>

        {/* 2. Blok Profil, Profil Menu, & Logout */}
        <div className="px-4 pt-5 pb-2 shrink-0">
          <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#65C466]/20 flex items-center justify-center text-[#65C466] font-bold text-sm border border-[#65C466]/30 shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "M"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-[#1E293B] truncate">
                  {user?.name || "Member"}
                </p>
                <p className="text-xs text-[#64748B] capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link
                href="/customer/profil"
                onClick={close}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#64748B] hover:text-[#1E293B] hover:bg-gray-50 transition-colors shadow-sm cursor-pointer">
                <Settings size={14} />
                <span>Profil</span>
              </Link>
              <button
                onClick={logout}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-red-100 rounded-lg text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors shadow-sm cursor-pointer">
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Daftar Menu Navigasi Utama (Ditambahkan cursor-pointer) */}
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
                  relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer
                  ${
                    isActive
                      ? "bg-[#65C466]/10 text-[#65C466] font-semibold"
                      : "text-[#64748B] hover:bg-gray-50 hover:text-[#1E293B] font-medium"
                  }
                `}>
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

      {/* Area Konten Utama */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        <header className="lg:hidden h-16 bg-white border-b border-[#E2E8F0] flex items-center px-4 shrink-0 z-30">
          <button
            onClick={toggle}
            className="text-[#64748B] p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-lg text-[#1E293B] ml-2">
            Member Area
          </span>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">{children}</div>
      </main>

      {/* Host Modal Customer */}
      <CustomerModalHost />
    </div>
  );
}
