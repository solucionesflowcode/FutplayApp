import SidebarUsuarioNuevo from "../../components/navbars/SidebarUsuarioNuevo";
import "../globals.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col md:flex-row h-screen">
            <SidebarUsuarioNuevo />

            <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
    );
}
