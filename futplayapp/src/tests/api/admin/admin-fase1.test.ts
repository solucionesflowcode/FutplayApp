import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

// Fase 1 del plan de UI/UX del admin (docs/PLAN_UI_UX_ADMIN.md): APIs de
// alumnos (teléfono/RUT) y planes (tipo, Liga, borrado de planes en uso).

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
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

import { POST as POST_STUDENT, PUT as PUT_STUDENT } from "@/app/api/admin/students/route";
import { POST as POST_PLAN, PUT as PUT_PLAN, DELETE as DELETE_PLAN } from "@/app/api/admin/planes/route";
import { PUT as PUT_PROFESOR } from "@/app/api/admin/profesores/route";

function req(url: string, method: string, body?: object): Request {
    return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
}

/** Payloads pasados a `method` (insert/update) sobre `table`. */
function escrituras(table: string, method: "insert" | "update" | "delete"): unknown[] {
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

describe("PUT /api/admin/students — RUT y teléfono (USR-03, USR-04)", () => {
    it("ADM-STU-001: guarda el teléfono normalizado (+569XXXXXXXX), no con espacios", async () => {
        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", telefono: "+56 9 7904 6977" }));

        expect(res.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ telefono: "+56979046977" }]);
    });

    it("ADM-STU-002: RUT y teléfono vacíos se borran (null)", async () => {
        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", rut: "", telefono: null }));

        expect(res.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ rut: null, telefono: null }]);
    });

    it("ADM-STU-003: un teléfono inválido se rechaza sin tocar la BD", async () => {
        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", telefono: "1234" }));

        expect(res.status).toBe(400);
        expect(escrituras("usuario", "update")).toEqual([]);
    });

    it("ADM-STU-004: al crear un alumno con teléfono inválido no se crea la cuenta de auth", async () => {
        const res = await POST_STUDENT(req("http://localhost:3000/api/admin/students", "POST", {
            email: "nuevo@test.cl", nombre: "Nuevo", rol: "jugador", telefono: "99",
        }));

        expect(res.status).toBe(400);
        expect(ref.client.auth.admin.createUser).not.toHaveBeenCalled();
    });
});

describe("/api/admin/planes — tipo de plan y Liga (PLA-03)", () => {
    it("ADM-PLA-001: crea un plan con su tipo", async () => {
        const res = await POST_PLAN(req("http://localhost:3000/api/admin/planes", "POST", {
            nombre: "Kids x3", precio: 60000, tokens_mensuales: 12, dias: 30, tipo_plan: "kids",
        }));

        expect(res.status).toBe(200);
        expect(escrituras("plan", "insert")).toEqual([expect.objectContaining({ tipo_plan: "kids", tokens_mensuales: 12 })]);
    });

    it("ADM-PLA-002: un plan Liga se guarda con 0 tokens (antes 'tokens > 0' lo impedía)", async () => {
        const res = await POST_PLAN(req("http://localhost:3000/api/admin/planes", "POST", {
            nombre: "Liga 2026", precio: 40000, tokens_mensuales: 5, dias: 30, tipo_plan: "liga",
        }));

        expect(res.status).toBe(200);
        expect(escrituras("plan", "insert")).toEqual([expect.objectContaining({ tipo_plan: "liga", tokens_mensuales: 0 })]);
    });

    it("ADM-PLA-003: un plan que no es Liga necesita al menos 1 token; tipo inválido se rechaza", async () => {
        const sinTokens = await POST_PLAN(req("http://localhost:3000/api/admin/planes", "POST", {
            nombre: "Raro", precio: 1000, tokens_mensuales: 0, tipo_plan: "normal",
        }));
        const tipoInvalido = await POST_PLAN(req("http://localhost:3000/api/admin/planes", "POST", {
            nombre: "Raro", precio: 1000, tokens_mensuales: 4, tipo_plan: "vip",
        }));

        expect(sinTokens.status).toBe(400);
        expect(tipoInvalido.status).toBe(400);
        expect(escrituras("plan", "insert")).toEqual([]);
    });

    it("ADM-PLA-004: cambiar un plan a Liga deja sus tokens en 0", async () => {
        __setTableData("plan", [{ id: "p1", tipo_plan: "normal", tokens_mensuales: 4 }]);

        const res = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "p1", tipo_plan: "liga" }));

        expect(res.status).toBe(200);
        expect(escrituras("plan", "update")).toEqual([expect.objectContaining({ tipo_plan: "liga", tokens_mensuales: 0 })]);
    });
});

describe("/api/admin/planes — los planes se desactivan, no se eliminan (PLA-02)", () => {
    it("ADM-PLA-005: DELETE responde 405 y no borra nada (aunque el plan no tenga uso)", async () => {
        const res = await DELETE_PLAN();

        expect(res.status).toBe(405);
        expect((await res.json()).error).toContain("desactívalo");
        expect(escrituras("plan", "delete")).toEqual([]);
    });

    it("ADM-PLA-006: desactivar y reactivar con PUT { activo }", async () => {
        const res = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "p1", activo: false }));

        expect(res.status).toBe(200);
        expect(escrituras("plan", "update")).toEqual([{ activo: false }]);
    });

    it("ADM-PLA-007: activo debe ser booleano; un PUT sin campos se rechaza", async () => {
        const invalido = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "p1", activo: "no" }));
        const vacio = await PUT_PLAN(req("http://localhost:3000/api/admin/planes", "PUT", { id: "p1" }));

        expect(invalido.status).toBe(400);
        expect(vacio.status).toBe(400);
        expect(escrituras("plan", "update")).toEqual([]);
    });
});

describe("PUT /api/admin/profesores — quitar rol y datos opcionales (PRO-01, PRO-02)", () => {
    const URL_PROF = "http://localhost:3000/api/admin/profesores";

    it("ADM-PRO-001: quitar el rol deja al profesor como jugador (conserva la cuenta)", async () => {
        __setTableData("usuario", [{ id: "pr1", rol: "profesor", email: "pr1@test.cl" }]);

        const res = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "pr1", rol: "jugador" }));

        expect(res.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ rol: "jugador" }]);
        expect(escrituras("usuario", "delete")).toEqual([]);
        expect(ref.client.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("ADM-PRO-002: con clases o cápsulas asignadas no se quita el rol (409)", async () => {
        __setTableData("usuario", [{ id: "pr1", rol: "profesor" }]);
        __setTableData("clase", [{ id: "c1", profesor_id: "pr1" }]);
        __setTableData("capsula", [{ id: "k1", profesor_id: "pr1" }, { id: "k2", profesor_id: "otro" }]);

        const res = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "pr1", rol: "jugador" }));
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body).toMatchObject({ clases_asociadas: 1, capsulas_asociadas: 1 });
        expect(body.error).toContain("quitar el rol");
        expect(escrituras("usuario", "update")).toEqual([]);
    });

    it("ADM-PRO-003: solo se le quita el rol a un profesor (no a un admin)", async () => {
        __setTableData("usuario", [{ id: "a1", rol: "administrador" }]);

        const res = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "a1", rol: "jugador" }));

        expect(res.status).toBe(400);
        expect(escrituras("usuario", "update")).toEqual([]);
    });

    it("ADM-PRO-004: teléfono normalizado; teléfono y foto en null se borran", async () => {
        const normalizado = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "pr1", telefono: "9 7904 6977" }));
        const borrado = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "pr1", telefono: null, foto_url: null }));

        expect(normalizado.status).toBe(200);
        expect(borrado.status).toBe(200);
        expect(escrituras("usuario", "update")).toEqual([{ telefono: "+56979046977" }, { telefono: null, foto_url: null }]);
    });

    it("ADM-PRO-005: un teléfono inválido se rechaza sin tocar la BD", async () => {
        const res = await PUT_PROFESOR(req(URL_PROF, "PUT", { id: "pr1", telefono: "12" }));

        expect(res.status).toBe(400);
        expect(escrituras("usuario", "update")).toEqual([]);
    });
});
