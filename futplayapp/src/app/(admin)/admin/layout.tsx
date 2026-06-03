"use client";

import Sidebar from "@/components/admin/Sidebar";
import { AuthGuard } from "@/context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <div className="flex min-h-screen bg-[#F8F9FB]">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}