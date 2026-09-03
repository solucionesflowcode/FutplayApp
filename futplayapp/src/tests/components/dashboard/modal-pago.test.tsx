// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// ── Mocks de dependencias pesadas del dashboard ─────
vi.mock("next/navigation", () => ({
    useSearchParams: vi.fn(),
    useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("@/context", () => ({
    useAuthUser: vi.fn(),
}));

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/data/fichaMedica", () => ({
    userHasFichaMedica: vi.fn(),
}));

// Subcomponentes del dashboard → no-op para aislar el modal
vi.mock("../../../components/navbars/TopNavBarUser", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/ProximoEntrenamiento", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/AvisoReagendar", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/MiAsistencia", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/ProximaRenovacion", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/MetricasCorporales", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/Recordatorio", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/PlanesRender", () => ({ default: () => <div /> }));
vi.mock("../../../components/userDashboard/CapsulasClient", () => ({ default: () => <div /> }));

import { useSearchParams } from "next/navigation";
import { useAuthUser } from "@/context";
import { createClient } from "@/utils/supabase/client";
import { userHasFichaMedica } from "@/data/fichaMedica";
import DashboardClient from "../../../app/(dashboard)/dashboard/dashboard-client";

// ── Mock helpers ────────────────────────────────────

function mockSearchParams(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    (useSearchParams as any).mockReturnValue(sp);
}

function mockSupabase() {
    const from = vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                    lt: vi.fn(() => ({
                        limit: vi.fn(() => ({
                            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                        })),
                    })),
                })),
            })),
        })),
    }));
    (createClient as any).mockReturnValue({
        auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "user-1" } }, error: null })) },
        from,
    });
    (userHasFichaMedica as any).mockResolvedValue(false);
}

// ── Tests ───────────────────────────────────────────

describe("Modal de confirmación de pago (DashboardClient)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        (useAuthUser as any).mockReturnValue({
            user: { id: "user-1" },
            usuario: { nombre: "Juan Pérez", rol: "jugador" },
            loading: false,
        });
        Object.defineProperty(window, "history", { value: { replaceState: vi.fn() }, configurable: true });
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("con flujoSuccess=1 y pago 'pagado', muestra '¡Pago exitoso!' y no queda 'Confirmando pago'", async () => {
        mockSearchParams({ flowSuccess: "1", token: "tk-test" });
        sessionStorage.setItem("flowBoletaId", "boleta-1");
        mockSupabase();

        global.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ estado: "pagado" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        ) as any;

        render(<DashboardClient />);

        // Inicialmente se muestra "Confirmando pago"
        expect(screen.getByText("Confirmando pago")).toBeTruthy();

        // El poll debe resolver a "pagado" y mostrar éxito
        await waitFor(() => {
            expect(screen.getByText("¡Pago exitoso!")).toBeTruthy();
        }, { timeout: 3000 });

        expect(screen.queryByText("Confirmando pago")).toBeNull();
        expect(screen.queryByText("Verificando pago")).toBeNull();
    });

    it("si el endpoint no responde, NUNCA queda 'Confirmando pago' por siempre: pasa a 'Verificando pago'", async () => {
        vi.useFakeTimers();
        mockSearchParams({ flowSuccess: "1", token: "tk-test" });
        sessionStorage.setItem("flowBoletaId", "boleta-2");
        mockSupabase();

        // fetch que nunca resuelve → simula el endpoint colgado que causaba el bug
        global.fetch = vi.fn((_input: any, _init: any) => new Promise(() => {})) as any;

        render(<DashboardClient />);

        expect(screen.getByText("Confirmando pago")).toBeTruthy();

        // Registrar que se inicializó el fetch (se llama en el primer tick del poll)
        await act(async () => {});

        // Avanzar más allá del límite duro de 25 s
        await act(async () => {
            vi.advanceTimersByTime(30_000);
        });

        // El modal de "Confirmando pago" debe haber salido
        expect(screen.queryByText("Confirmando pago")).toBeNull();
        // Debe mostrar el aviso neutro con salida
        expect(screen.getByText("Verificando pago")).toBeTruthy();
    });
});
