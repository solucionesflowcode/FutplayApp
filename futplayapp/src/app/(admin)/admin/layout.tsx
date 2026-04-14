import SideBarAdmin from "../../../components/navbars/SideBarAdmin";
import "../../globals.css";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SideBarAdmin>
                <main>{children}</main>
            </SideBarAdmin>
        </>
    );
}
