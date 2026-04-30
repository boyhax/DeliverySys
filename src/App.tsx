// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import OrderFlow from "./pages/OrderFlow";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans text-slate-900 w-full overflow-hidden">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/order" element={<OrderFlow />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile/*" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
