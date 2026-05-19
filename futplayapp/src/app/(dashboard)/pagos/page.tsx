import { Suspense } from "react";
import PagosClient from "./pagos-client";

export default function PagosPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F28C28]" />
                        <p className="text-gray-500 font-medium">Cargando...</p>
                    </div>
                </div>
            }
        >
            <PagosClient />
        </Suspense>
    );
}
