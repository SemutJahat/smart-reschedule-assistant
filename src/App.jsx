import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Beranda from "./pages/LandingPage/Beranda";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Impor komponen layout dan halaman dashboard
import CustomerLayout from "./pages/CustomerDashboard/CustomerLayout";
import JadwalSaya from "./pages/CustomerDashboard/JadwalSaya";
import StatusReschedule from "./pages/CustomerDashboard/StatusReschedule";
import AdminLayout from "./pages/AdminDashboard/AdminLayout";
import ValidasiReschedule from "./pages/AdminDashboard/ValidasiReschedule";
import TambahCoach from "./pages/AdminDashboard/TambahCoach";
import DataPengguna from "./pages/AdminDashboard/DataPengguna";

function App() {
  return (
    <Router>
      <Routes>
        {/* Rute Publik */}
        <Route path="/" element={<Beranda />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Khusus Dashboard Customer */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<JadwalSaya />} />
          <Route path="status" element={<StatusReschedule />} />
        </Route>

        {/* Rute Khusus Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ValidasiReschedule />} />
          <Route path="pengguna" element={<DataPengguna />} />
          <Route path="pengguna/tambah-coach" element={<TambahCoach />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
