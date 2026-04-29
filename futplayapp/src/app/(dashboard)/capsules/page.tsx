import CapsulesPage from "./capsules-client";
import { getCapsulas } from "@/data/capsules";

export default async function Page() {
    const capsulas = await getCapsulas();
    return <CapsulesPage capsulas={capsulas} />;
}
