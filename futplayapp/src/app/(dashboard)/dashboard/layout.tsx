import SideBarUsuario from "../../../components/navbars/SideBarUsuario";
import "../../globals.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SideBarUsuario>
                <main >{children}</main>
            </SideBarUsuario>
        </>
    );
}
