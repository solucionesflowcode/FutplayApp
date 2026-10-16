import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

// Ajustes del admin (oct-2026): N° de boleta en membresías, planes ocultos y
// sede principal del usuario (docs/migrations/2026-10-admin-boleta-oculto-sede.sql).

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

const ref = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof import("@/tests/mocks/supabase").createMockServerClient> }));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@/utils/supabase/admin", () => ({
    verifyAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", email: "admin@test.cl" })),
    getAdminClient: vi.fn(() => Promise.resolve(ref.client)),
}));

import { PUT as PUT_PLAN } from "@/app/api/admin/planes/route";
import { POST as POST_LINK } from "@/app/api/admin/planes/link/route";
import { POST as POST_GESTION, PUT as PUT_GESTION } from "@/app/api/admin/membresias/gestion/route";
import { PUT as PUT_STUDENT } from "@/app/api/admin/students/route";
import { GET as GET_MENSUAL } from "@/app/api/admin/analiticas/mensual/route";
import { requiereLink } from "@/lib/planes-link";
import { coincideSede } from "@/lib/sedes";

function req(url: string, method: string, body?: object): Request {
    return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function escrituras(table: string, method: "insert" | "update"): unknown[] {
    const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;
    const payloads: unknown[] = [];
    fromSpy.mock.calls.forEach((call: unknown[], i: number) => {
        if (call[0] !== table) return;
        for (const c of fromSpy.mock.results[i].value[method].mock.calls) payloads.push(c[0] ?? true);
    });
    return payloads;
}

beforeEach(() => {
    __resetMocks();
    ref.client = createMockServerClient();
});

describe("reglas", () => {
    it("AJU-LIB-001: requiereLink: familiar y liga siempre; el resto solo si está oculto", () => {
        expect(requiereLink({ tipo_plan: "familiar" })).toBe(true);
        expect(requiereLink({ tipo_plan: "liga", oculto: false })).toBe(true);
        expect(requiereLink({ tipo_plan: "kids" })).toBe(false);
        expect(requiereLink({ tipo_plan: "kids", oculto: true })).toBe(true);
        expect(requiereLink({ tipo_plan: null, oculto: true })).toBe(true);
    });

    it("AJU-LIB-002: coincideSede: todas, sin sede o una sede", () => {
        expect(coincideSede("s1", null)).toBe(true);
        expect(coincideSede(null, "sin")).toBe(true);
        expect(coincideSede("s1", "sin")).toBe(false);
        expect(coincideSede("s1", "s1")).toBe(true);
        expect(coincideSede(null, "s1")).toBe(false);
    });
});

describe("PUT /api/admin/planes — ocultar", () => {
    it("AJU-PLA-001: oculta un plan kids", async () => {
        __setTableData("plan", [{ id: "k1", tipo_plan: "kids", tokens_mensuales: 4 }]);

        const res = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "k1", oculto: true }));

        expect(res.status).toBe(200);
        expect(escrituras("plan", "update")).toEqual([{ oculto: true }]);
    });

    it("AJU-PLA-002: familiar y liga no se pueden mostrar en el catálogo", async () => {
        __setTableData("plan", [{ id: "f1", tipo_plan: "familiar", tokens_mensuales: 12 }]);

        const res = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "f1", oculto: false }));

        expect(res.status).toBe(400);
        expect(escrituras("plan", "update")).toEqual([]);
    });

    it("AJU-PLA-003: oculto debe ser booleano", async () => {
        const res = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "k1", oculto: "si" }));

        expect(res.status).toBe(400);
    });
});

describe("POST /api/admin/planes/link", () => {
    it("AJU-LINK-001: genera el link de un plan oculto", async () => {
        __setTableData("plan", [{ id: "k1", nombre: "Kids x1", tipo_plan: "kids", oculto: true }]);

        const res = await POST_LINK(req("http://localhost:3000/api/admin/planes/link", "POST", { id: "k1" }));

        expect(res.status).toBe(200);
        expect((await res.json()).url).toMatch(/\/planes\/familiar\//);
    });

    it("AJU-LINK-002: un plan visible en el catálogo no tiene link", async () => {
        __setTableData("plan", [{ id: "n1", nombre: "Basico", tipo_plan: "normal", oculto: false }]);

        const res = await POST_LINK(req("http://localhost:3000/api/admin/planes/link", "POST", { id: "n1" }));

        expect(res.status).toBe(400);
    });
});

describe("/api/admin/membresias/gestion — N° de boleta", () => {
    const nueva = { usuario_id: "u1", plan_id: "p1", tokens_totales: 4, fecha_inicio: "2026-10-14T00:00:00.000Z", fecha_vencimiento: "2026-11-13T00:00:00.000Z" };

    it("AJU-BOL-001: al crear guarda el N° sin espacios", async () => {
        const res = await POST_GESTION(req("http://localhost:3000/api/admin/membresias/gestion", "POST", { ...nueva, numero_boleta: "  12345 " }));

        expect(res.status).toBe(200);
        expect(escrituras("membresia", "insert")).toEqual([expect.objectContaining({ numero_boleta: "12345" })]);
    });

    it("AJU-BOL-002: vacío queda null (no cuenta en analíticas)", async () => {
        await POST_GESTION(req("http://localhost:3000/api/admin/membresias/gestion", "POST", { ...nueva, numero_boleta: "   " }));

        expect(escrituras("membresia", "insert")).toEqual([expect.objectContaining({ numero_boleta: null })]);
    });

    it("AJU-BOL-003: se puede anotar al editar", async () => {
        const res = await PUT_GESTION(req("http://localhost:3000/api/admin/membresias/gestion", "PUT", { id: "m1", numero_boleta: "999" }));

        expect(res.status).toBe(200);
        expect(escrituras("membresia", "update")).toEqual([{ numero_boleta: "999" }]);
    });
});

describe("PUT /api/admin/students — sede principal", () => {
    it("AJU-SEDE-001: asigna una sede existente", async () => {
        __setTableData("sede", [{ id: "s1", nombre: "Las Condes" }]);

        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", sede_id: "s1" }));

        expect(res.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ sede_id: "s1" }]);
    });

    it("AJU-SEDE-002: vacío la deja sin asignar", async () => {
        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", sede_id: "" }));

        expect(res.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ sede_id: null }]);
    });

    it("AJU-SEDE-003: una sede que no existe se rechaza sin tocar la BD", async () => {
        __setTableData("sede", []);

        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", sede_id: "no-existe" }));

        expect(res.status).toBe(400);
        expect(escrituras("usuario", "update")).toEqual([]);
    });
});

describe("GET /api/admin/analiticas/mensual", () => {
    beforeEach(() => {
        __setTableData("plan", [{ id: "p1", precio: 30000 }]);
        __setTableData("boleta", []);
        __setTableData("usuario", [{ id: "u1", sede_id: "s1" }, { id: "u2", sede_id: "s2" }, { id: "u3", sede_id: null }]);
        __setTableData("membresia", [
            { usuario_id: "u1", plan_id: "p1", fecha_inicio: "2026-10-02T00:00:00.000Z", boleta_id: "b1", numero_boleta: null },
            { usuario_id: "u2", plan_id: "p1", fecha_inicio: "2026-10-03T00:00:00.000Z", boleta_id: null, numero_boleta: "77" },
            // Regalada desde el panel: no cuenta.
            { usuario_id: "u3", plan_id: "p1", fecha_inicio: "2026-10-04T00:00:00.000Z", boleta_id: null, numero_boleta: null },
        ]);
    });

    it("AJU-ANA-001: solo suma las membresías con boleta", async () => {
        const json = await (await GET_MENSUAL(req("http://localhost:3000/api/admin/analiticas/mensual", "GET"))).json();

        expect(json).toEqual([{ mes: "2026-10", ingresos: 60000, membresias: 2, transacciones: 2 }]);
    });

    it("AJU-ANA-002: filtra por la sede principal del alumno", async () => {
        const s1 = await (await GET_MENSUAL(req("http://localhost:3000/api/admin/analiticas/mensual?sede=s1", "GET"))).json();
        expect(s1).toEqual([{ mes: "2026-10", ingresos: 30000, membresias: 1, transacciones: 1 }]);

        const sin = await (await GET_MENSUAL(req("http://localhost:3000/api/admin/analiticas/mensual?sede=sin", "GET"))).json();
        expect(sin).toEqual([]);
    });

    it("AJU-ANA-003: una boleta pagada sin membresía (pago de prueba) no suma, aunque su mes no tenga membresías", async () => {
        __setTableData("boleta", [{ usuario_id: "u3", total: 10000, created_at: "2026-08-10T12:00:00.000Z", estado: "pagado" }]);

        const sin = await (await GET_MENSUAL(req("http://localhost:3000/api/admin/analiticas/mensual?sede=sin", "GET"))).json();
        const todas = await (await GET_MENSUAL(req("http://localhost:3000/api/admin/analiticas/mensual", "GET"))).json();

        expect(sin).toEqual([]);
        expect(todas.map((m: { mes: string }) => m.mes)).toEqual(["2026-10"]);
    });
});
