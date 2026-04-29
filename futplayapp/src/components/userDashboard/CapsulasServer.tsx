import CapsulasRender from "@/components/userDashboard/CapsulasRender";
import { getCapsulas } from "@/data/capsules";

export default async function CapsulasServer() {
    const capsulas = await getCapsulas();
    return <CapsulasRender capsulas={capsulas.slice(0, 4)} />;
}
