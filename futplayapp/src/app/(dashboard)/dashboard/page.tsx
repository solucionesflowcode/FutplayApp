import DashboardClient from "./dashboard-client";
import CapsulasServer from "@/components/userDashboard/CapsulasServer";

export default function Page() {
    return (
        <DashboardClient>
            <CapsulasServer />
        </DashboardClient>
    );
}
