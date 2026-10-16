// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { membresiaVigente, porcentajeConPlanActivo, tieneBoleta } from "@/lib/analiticas";
import type { MembresiaConPlan } from "@/data/membresia";

const USUARIOS = [
    { id: "u1", rol: "jugador", sede_id: "s1" },
    { id: "u2", rol: "jugador", sede_id: "s1" },
    { id: "u3", rol: "jugador", sede_id: null },
    { id: "a1", rol: "administrador", sede_id: null },
];
const SEDES = [{ id: "s1", nombre: "Las Condes" }, { id: "s2", nombre: "Ñuñoa" }];

vi.mock("@/utils/supabase/client", () => ({
    createClient: () => ({
        from: (tabla: string) => ({
            select: () =>
                tabla === "sede"
                    ? { order: () => Promise.resolve({ data: SEDES, error: null }) }
                    : Promise.resolve({ data: USUARIOS, error: null }),
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

describe("Analíticas: solo membresías con boleta y filtro por sede", () => {
    it("ANA-BOL-001: cuenta la boleta de Flow o un N° de boleta externo; sin boleta no cuenta", () => {
        expect(tieneBoleta({ boleta_id: "b1" })).toBe(true);
        expect(tieneBoleta({ boleta_id: null, numero_boleta: "12345" })).toBe(true);
        expect(tieneBoleta({ boleta_id: null, numero_boleta: "   " })).toBe(false);
        expect(tieneBoleta({})).toBe(false);
    });

    it("ANA-BOL-002: la página pide solo las membresías con boleta", async () => {
        vi.mocked(getAdminMembresias).mockResolvedValue([]);
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
        render(<AnaliticasPage />);

        await screen.findByText("% con plan activo");
        expect(getAdminMembresias).toHaveBeenCalledWith({ conBoleta: true, todas: true });
    });

    it("ANA-SEDE-001: al elegir una sede cambian los alumnos, el % y los ingresos se piden de esa sede", async () => {
        vi.mocked(getAdminMembresias).mockResolvedValue([
            membresia({ usuario_id: "u1", sede_id: "s1", fecha_vencimiento: "2099-01-01" }),
            membresia({ usuario_id: "u3", membresia_id: "z", sede_id: null, fecha_vencimiento: "2099-01-01" }),
        ]);
        const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => [] }));
        vi.stubGlobal("fetch", fetchMock);
        render(<AnaliticasPage />);

        // Todas las sedes: 3 alumnos, 2 con plan → 67%.
        expect(await screen.findByText("67%")).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText("Filtrar por sede"), { target: { value: "s1" } });

        // Sede s1: u1 y u2, solo u1 con plan → 50%.
        expect(await screen.findByText("50%")).toBeInTheDocument();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/analiticas/mensual?sede=s1"));

        fireEvent.change(screen.getByLabelText("Filtrar por sede"), { target: { value: "sin" } });
        // Sin sede: solo u3, con plan → 100%.
        expect(await screen.findByText("100%")).toBeInTheDocument();
    });
});

describe("Analíticas: ventas = todas las membresías con boleta; estado de hoy = la actual", () => {
    it("ANA-VEN-001: una renovación cuenta como venta, pero el alumno vale uno en vigentes y % con plan", async () => {
        vi.mocked(getAdminMembresias).mockResolvedValue([
            membresia({ usuario_id: "u1", membresia_id: "vieja", fecha_inicio: "2026-09-01T12:00:00Z", fecha_vencimiento: "2026-09-30T12:00:00Z", estado: false }),
            membresia({ usuario_id: "u1", membresia_id: "nueva", fecha_inicio: "2026-10-01T12:00:00Z", fecha_vencimiento: "2099-01-01T12:00:00Z" }),
        ]);
        vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
        render(<AnaliticasPage />);

        // 1 de 3 alumnos con plan; 1 membresía vigente.
        expect(await screen.findByText("33%")).toBeInTheDocument();
        expect(screen.getByText("Membresías vigentes").parentElement!.parentElement!).toHaveTextContent("1");
        // Ventas por plan: las 2 membresías con boleta.
        expect(screen.getByText("2 ventas · 100%")).toBeInTheDocument();
    });
});
