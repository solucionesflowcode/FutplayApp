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
                    <div className="hidden md:block fixed top-4 right-6 z-30">
                        <UserDropdown />
                    </div>
                    {children}
                </main>
            </div>
        </AuthGuard>
    );
}
