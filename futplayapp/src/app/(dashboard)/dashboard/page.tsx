import DashboardClient from "./dashboard-client";
import { AuthGuard } from "@/context";

export default function Page() {
    return (
        <AuthGuard allowedRoles={["jugador", "profesor"]}>
            <DashboardClient />
        </AuthGuard>
    );
}
