import { NavLink, useNavigate } from "react-router-dom";

export default function SidebarAdmin() {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Validasi Reschedule",
      path: "/admin",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      name: "Jadwal Latihan",
      path: "/admin/jadwal",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      name: "Data Pengguna",
      path: "/admin/pengguna",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      name: "Katalog Layanan",
      path: "/admin/katalog",
      icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("gym_user");
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-deep-slate min-h-screen flex flex-col sticky top-0 text-pure-white">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-soft-border/20">
        <img src="/logo-gymnasyum.webp" alt="Logo" className="w-8 h-8" />
        <span className="font-bold text-xl tracking-wide">ADMIN PANEL</span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-pure-white shadow-md"
                  : "text-soft-border hover:bg-pure-white/10 hover:text-pure-white"
              }`
            }>
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d={item.icon}></path>
            </svg>
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-soft-border/20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-red-400 hover:bg-red-400/10 transition-colors">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  );
}
