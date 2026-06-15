"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { AuthGuard } from "@/context";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#F8F9FB]">
        {/* Mobile Header Bar */}
        <header className="flex items-center justify-between bg-[#001529] text-white px-4 py-3 md:hidden sticky top-0 z-30 shadow-md">
          <div>
            <h1 className="text-lg font-bold">FutPlay</h1>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}