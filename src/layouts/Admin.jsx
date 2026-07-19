import React, { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminFooter from "components/Footers/AdminFooter.jsx";
import AdminNavbar from "components/Navbars/AdminNavbar.jsx";
import Sidebar from "components/Sidebar/Sidebar.jsx";
import routes from "routes.js";

function Admin() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeRoute = routes.find((route) => location.pathname.includes(route.path));
  const brandText = activeRoute?.name || "Company Network";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        routes={routes}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-h-screen lg:pl-[17rem]">
        <AdminNavbar
          brandText={brandText}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            {routes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            ))}
            <Route path="*" element={<Navigate to="/index" replace />} />
          </Routes>
        </main>

        <AdminFooter />
      </div>
    </div>
  );
}

export default Admin;
