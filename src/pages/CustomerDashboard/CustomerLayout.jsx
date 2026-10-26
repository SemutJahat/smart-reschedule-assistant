import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex bg-clean-bg font-sans">
      {/* Sidebar Statis di Kiri */}
      <Sidebar />

      {/* Area Konten Dinamis di Kanan */}
      <main className="flex-1 max-w-5xl mx-auto p-8 lg:p-12">
        <Outlet />
        {/* <Outlet /> adalah tempat komponen halaman (seperti JadwalSaya) akan dirender */}
      </main>
    </div>
  );
}
