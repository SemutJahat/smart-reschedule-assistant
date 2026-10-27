import { Outlet } from "react-router-dom";
import SidebarAdmin from "../../components/SidebarAdmin";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-clean-bg font-sans">
      <SidebarAdmin />
      <main className="flex-1 max-w-6xl mx-auto p-8 lg:p-12">
        <Outlet />
      </main>
    </div>
  );
}
