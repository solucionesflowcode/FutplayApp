"use client";

import { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import ProfileDropdown from "@/components/admin/ProfileDropdown";
import { ToastProvider } from "@/components/admin/ui";
import { AuthGuard, AuthProvider } from "@/context";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard allowedRoles={["administrador"]}>
        <div className="flex flex-col md:flex-row min-h-screen bg-[#F8F9FB]">
          {/* Mobile Header Bar */}
          <header className="flex items-center justify-between bg-[#001529] text-white px-4 py-3 md:hidden sticky top-0 z-30 shadow-md">
            <div>
              {/* Un solo h1 por página: el de PageHeader. */}
              <p className="text-lg font-bold">FutPlay</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin Panel</p>
            </div>
            <div className="flex items-center gap-3">
              <ProfileDropdown />
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
                aria-controls="admin-menu"
                className="p-2 hover:bg-white/10 rounded-lg text-white"
              >
                <Menu size={24} aria-hidden />
              </button>
            </div>
          </header>

          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          <main className="flex-1 overflow-x-hidden relative">
            {/* Desktop Top Bar */}
            <div className="hidden md:flex items-center justify-end px-6 py-3 sticky top-0 bg-[#F8F9FB] z-30">
              <ProfileDropdown />
            </div>
            {/* Avisos (useToast) disponibles en todas las pantallas del admin. */}
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}