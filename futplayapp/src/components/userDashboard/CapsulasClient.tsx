"use client";

import { useEffect, useState } from "react";
import { getCapsulasClient, type Capsula } from "@/data/capsules-client";
import CapsulasRender from "./CapsulasRender";

export default function CapsulasClient() {
    const [capsulas, setCapsulas] = useState<Capsula[]>([]);

    useEffect(() => {
        getCapsulasClient().then(setCapsulas);
    }, []);

    return <CapsulasRender capsulas={capsulas.slice(0, 4)} />;
}
