import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import CTVBoardPage from "./pages/CTVBoardPage";
import AdminCTVRoutesPage from "./pages/AdminCTVRoutesPage";
import AdminCTVTemplatePage from "./pages/AdminCTVTemplatePage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

// ✅ NEW IMPORTS (create these next)
import TVLoginPage from "./pages/TVLoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default */}
        <Route path="/" element={<Navigate to="/ctv-board" replace />} />

        {/* ✅ LOGIN ROUTES */}
        <Route path="/tv-login" element={<TVLoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* TV */}
        <Route path="/ctv-board" element={<CTVBoardPage />} />

        {/* ADMIN */}
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin" element={<AdminCTVRoutesPage />} />
        <Route path="/templates" element={<AdminCTVTemplatePage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/ctv-board" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;