import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { api } from "./services/api";
import type { User } from "./types";

function DashboardGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => { api.me().then(({ user: current }) => setUser(current)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <div className="grid min-h-screen place-items-center text-sm font-medium text-ink/55">Loading your workspace…</div>;
  return user ? <DashboardPage user={user} /> : <Navigate to="/" replace />;
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<LoginPage />} /><Route path="/dashboard" element={<DashboardGate />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}
