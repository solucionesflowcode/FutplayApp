// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { membresiaVigente, porcentajeConPlanActivo } from "@/lib/analiticas";
import type { MembresiaConPlan } from "@/data/membresia";

vi.mock("@/utils/supabase/client", () => ({
    createClient: () => ({
        from: () => ({
            select: () => Promise.resolve({
                data: [{ id: "u1", rol: "jugador" }, { id: "u2", rol: "jugador" }, { id: "u3", rol: "jugador" }, { id: "a1", rol: "administrador" }],
                error: null,
            }),
        }),
    }),
}));
vi.mock("@/data/membresia", () => ({ getAdminMembresias: vi.fn() }));
vi.mock("@/data/plans", () => ({ getPlanesAdmin: vi.fn(() => Promise.resolve({ planes: [] })) }));

import { getAdminMembresias } from "@/data/membresia";
import AnaliticasPage from "@/app/(admin)/admin/analiticas/page";

const HOY = "2026-10-14";

function membresia(over: Partial<MembresiaConPlan>): MembresiaConPlan {
    return {
        membresia_id: "x", usuario_id: "u1", plan_id: "p1", plan_nombre: "Basico", tokens_mensuales: 4, precio: 30000,
        tokens_totales: 4, tokens_usados: 1, tokens_restantes: 3, fecha_inicio: "2026-10-01", fecha_vencimiento: "2026-10-31",
        estado: true, congelada: false, sin_tokens: false, ...over,
    };
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

describe("% con plan activo (ANA-01)", () => {
    it("ANA-UNIT-001: solo cuenta membresías activas, no congeladas, con tokens y sin vencer", () => {
        expect(membresiaVigente(membresia({}), HOY)).toBe(true);
        expect(membresiaVigente(membresia({ congelada: true }), HOY)).toBe(false);
        expect(membresiaVigente(membresia({ sin_tokens: true }), HOY)).toBe(false);
        expect(membresiaVigente(membresia({ estado: false }), HOY)).toBe(false);
        expect(membresiaVigente(membresia({ fecha_vencimiento: "2026-10-13" }), HOY)).toBe(false);
        expect(membresiaVigente(membresia({ fecha_vencimiento: HOY }), HOY)).toBe(true);
    });

    it("ANA-UNIT-002: cuenta alumnos distintos (dos membresías del mismo alumno valen uno)", () => {
        const alumnos = new Set(["u1", "u2", "u3", "u4"]);
        const lista = [
            membresia({ usuario_id: "u1" }),
            membresia({ usuario_id: "u1", membresia_id: "y" }),
            membresia({ usuario_id: "u2", congelada: true }),
            membresia({ usuario_id: "profe" }),
        ];

        expect(porcentajeConPlanActivo(lista, alumnos, HOY)).toBe(25);
        expect(porcentajeConPlanActivo(lista, new Set(), HOY)).toBe(0);
    });
});

describe("Analíticas (fase 3)", () => {
    beforeEach(() => {
        vi.mocked(getAdminMembresias).mockResolvedValue([
            membresia({ usuario_id: "u1", fecha_vencimiento: "2099-01-01" }),
            membresia({ usuario_id: "u1", membresia_id: "y", fecha_vencimiento: "2099-01-01" }),
        ]);
    });

    it("ADM-ANA-UI-001: la métrica se llama '% con plan activo', no 'Retención'", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
        render(<AnaliticasPage />);

        expect(await screen.findByText("% con plan activo")).toBeInTheDocument();
        expect(screen.getByText("33%")).toBeInTheDocument();
        expect(screen.queryByText(/Retención/i)).toBeNull();
    });

    it("ADM-ANA-UI-002: si falla la API de ingresos se muestra el error, no una estimación (ANA-02)", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({}) })));
        render(<AnaliticasPage />);

        expect(await screen.findByRole("alert")).toHaveTextContent("No se pudieron cargar los ingresos");
        // Antes la tarjeta mostraba $60.000 (suma de precios de planes) sin avisar.
        const tarjeta = screen.getByText("Ingresos del mes").parentElement!.parentElement!;
        expect(tarjeta).toHaveTextContent("No disponible");
        expect(tarjeta).not.toHaveTextContent("$60.000");
    });
});
