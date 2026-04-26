import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Admin from "./pages/Admin";
import Global from "./pages/Global";
import Home from "./pages/Home";
import Participant from "./pages/Participant";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/u/:login" element={<Participant />} />
        <Route path="/global" element={<Global />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
