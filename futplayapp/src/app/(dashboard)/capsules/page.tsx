import CapsulesPage from "./capsules-client";
import { getCapsulas } from "@/data/capsules";
import { getCapsulaDestacadaId } from "@/lib/capsula-destacada";

export default async function Page() {
    const [capsulas, destacadaId] = await Promise.all([
        getCapsulas(),
        getCapsulaDestacadaId(),
    ]);
    return <CapsulesPage capsulas={capsulas} destacadaId={destacadaId} />;
}
