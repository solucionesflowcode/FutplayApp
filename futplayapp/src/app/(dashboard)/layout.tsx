"use client";

import SidebarUsuarioNuevo from "../../components/navbars/SidebarUsuarioNuevo";
import UserDropdown from "../../components/dashboard/UserDropdown";
import { AuthGuard } from "@/context";
import "../globals.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard allowedRoles={["jugador", "profesor"]}>
            <div className="flex flex-col md:flex-row h-screen">
                <SidebarUsuarioNuevo />
                <main className="flex-1 overflow-y-auto">
                    <div className="hidden md:flex items-center justify-end px-6 py-3 sticky top-0 bg-[#F8F9FB] z-30">
                        <UserDropdown />
                    </div>
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
