import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Beranda from "./pages/LandingPage/Beranda";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Impor komponen layout dan halaman dashboard
import CustomerLayout from "./pages/CustomerDashboard/CustomerLayout";
import JadwalSaya from "./pages/CustomerDashboard/JadwalSaya";
import PaketKuota from "./pages/CustomerDashboard/PaketKuota";
import BeliPaket from "./pages/CustomerDashboard/BeliPaket";
import ProfilSaya from "./pages/CustomerDashboard/ProfilSaya"; // <- Impor Halaman Profil

import AdminLayout from "./pages/AdminDashboard/AdminLayout";
import ValidasiReschedule from "./pages/AdminDashboard/ValidasiReschedule";
import TambahCoach from "./pages/AdminDashboard/TambahCoach";
import DataPengguna from "./pages/AdminDashboard/DataPengguna";
import ManajemenJadwal from "./pages/AdminDashboard/ManajemenJadwal";
import KatalogLayanan from "./pages/AdminDashboard/KatalogLayanan";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Khusus Dashboard Customer */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<JadwalSaya />} />
          <Route path="paket" element={<PaketKuota />} />
          <Route path="beli-paket" element={<BeliPaket />} />
          <Route path="profil" element={<ProfilSaya />} />{" "}
          {/* <- Rute Profil Baru */}
        </Route>

        {/* Rute Khusus Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ValidasiReschedule />} />
          <Route path="jadwal" element={<ManajemenJadwal />} />
          <Route path="pengguna" element={<DataPengguna />} />
          <Route path="pengguna/tambah-coach" element={<TambahCoach />} />
          <Route path="katalog" element={<KatalogLayanan />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
