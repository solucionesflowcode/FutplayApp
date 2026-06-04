"use client";

import SidebarProfesor from "@/components/navbars/SidebarProfesor";
import { AuthGuard } from "@/context";

export default function ProfesorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["profesor"]}>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#f8f9fb]">
        <SidebarProfesor />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
