import TopNavbar from "../../../components/navbars/TopNavBar";
import "../../globals.css";

export default function HomeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <TopNavbar />
            <main className="pt-20">{children}</main>
        </>
    );
}
