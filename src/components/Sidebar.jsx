import { NavLink, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  // Menu 'Status Reschedule' dihilangkan karena telah terintegrasi di Jadwal Saya
  const menuItems = [
    {
      name: "Jadwal Saya",
      path: "/customer",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      name: "Paket & Kuota",
      path: "/customer/paket",
      icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    },
    {
      name: "Profil Saya",
      path: "/customer/profil",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    },
  ];

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-pure-white border-r border-soft-border min-h-screen flex flex-col sticky top-0">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-soft-border">
        {/* Pastikan path logo sesuai dengan struktur public folder Anda */}
        <img
          src="/logo-gymnasyum.webp"
          alt="Logo"
          className="w-8 h-8 rounded-full"
        />
        <span className="font-bold text-xl text-deep-slate tracking-tight">
          GYMNASYUM
        </span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/customer"} // Agar '/' tidak selalu aktif
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${
                isActive
                  ? "bg-primary text-pure-white shadow-md shadow-primary/20"
                  : "text-muted-gray hover:bg-clean-bg hover:text-deep-slate"
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

      <div className="p-4 border-t border-soft-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 w-full rounded-xl font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors">
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
          Keluar Akun
        </button>
      </div>
    </aside>
  );
}
