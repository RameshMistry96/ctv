import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import CTVBoardPage from "./pages/CTVBoardPage";
import AdminCTVRoutesPage from "./pages/AdminCTVRoutesPage";
import AdminCTVTemplatePage from "./pages/AdminCTVTemplatePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

import TVLoginPage from "./pages/TVLoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/tv" replace />} />

        {/* LOGIN */}
        <Route path="/tv-login" element={<TVLoginPage />} />
        <Route path="/ctv-admin/login" element={<AdminLoginPage />} />

        {/* TV */}
        <Route path="/tv" element={<CTVBoardPage />} />

        {/* ADMIN */}
        <Route path="/ctv-admin" element={<AdminCTVRoutesPage />} />
        <Route path="/ctv-admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/ctv-admin/templates" element={<AdminCTVTemplatePage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/tv" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;