import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./index.css";
import AdminLayout from "layouts/Admin.jsx";
import { CompanyProvider } from "context/CompanyContext";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;
const redirect = window.location.search.match(/^\?\/([^&]*)(?:&(.*))?$/);

if (redirect) {
  const path = redirect[1].replace(/~and~/g, "&");
  const query = redirect[2] ? `?${redirect[2].replace(/~and~/g, "&")}` : "";
  window.history.replaceState(null, "", `${import.meta.env.BASE_URL}${path}${query}${window.location.hash}`);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <CompanyProvider>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  </CompanyProvider>,
);
