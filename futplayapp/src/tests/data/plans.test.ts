import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

vi.mock("@/utils/supabase/client", () => ({
    createClient: vi.fn(),
}));

vi.mock("@/data/membresia", () => ({
    getAdminMembresias: vi.fn(),
}));

import { createClient } from "@/utils/supabase/client";
import { getAdminMembresias } from "@/data/membresia";
import { getPlanes, getPlanesLimit, getPlanesAdmin, createPlanAdmin, updatePlanAdmin, setPlanActivo, getUsers } from "@/data/plans";

const MOCK_PLANS = [
    { id: "p1", nombre: "básico", tokens_mensuales: 10, precio: 15000, activo: true, oculto: false },
    { id: "p2", nombre: "pro", tokens_mensuales: 25, precio: 25000, activo: true, oculto: false },
    { id: "p3", nombre: "premium", tokens_mensuales: 50, precio: 40000, activo: true, oculto: false },
];

function mockFetch(response: object, status = 200) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(response), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
    );
}

beforeEach(() => {
    __resetMocks();
    vi.mocked(createClient).mockReturnValue(createMockServerClient() as any);
});

describe("getPlanes", () => {
    it("retorna lista de planes", async () => {
        __setTableData("plan", MOCK_PLANS);

        const result = await getPlanes();

        expect(result).toHaveLength(3);
        expect(result[0].nombre).toBe("básico");
    });

    it("DATA-PLANES-INACT-001: un plan desactivado no aparece en el catálogo", async () => {
        __setTableData("plan", [...MOCK_PLANS, { id: "p4", nombre: "viejo", tokens_mensuales: 4, precio: 9000, activo: false, oculto: false }]);

        const result = await getPlanes();

        expect(result.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    });

    it("DATA-PLANES-OCU-001: un plan oculto no aparece en el catálogo (solo se compra con su link)", async () => {
        __setTableData("plan", [...MOCK_PLANS, { id: "p5", nombre: "Kids x1", tokens_mensuales: 4, precio: 30000, activo: true, oculto: true }]);

        expect((await getPlanes()).map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
        expect((await getPlanesLimit(10)).map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
    });

    it("retorna array vacío si hay error", async () => {
        __setTableData("plan", null, { message: "Connection error" });

        const result = await getPlanes();

        expect(result).toEqual([]);
    });

    it("retorna array vacío si no hay datos", async () => {
        __setTableData("plan", []);

        const result = await getPlanes();

        expect(result).toEqual([]);
    });
});

describe("getPlanesLimit", () => {
    it("retorna N planes", async () => {
        __setTableData("plan", MOCK_PLANS);

        const result = await getPlanesLimit(2);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe("p1");
        expect(result[1].id).toBe("p2");
    });

    it("retorna array vacío si hay error", async () => {
        __setTableData("plan", null, { message: "Error" });

        const result = await getPlanesLimit(5);

        expect(result).toEqual([]);
    });
});

describe("getPlanesAdmin", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("DATA-PLANES-ADMIN-001: retorna lista de planes desde fetch", async () => {
        mockFetch(MOCK_PLANS);

        const result = await getPlanesAdmin();

        expect(result.planes).toHaveLength(3);
        expect(result.error).toBeUndefined();
    });

    it("DATA-PLANES-ADMIN-002: retorna error si fetch falla con status", async () => {
        mockFetch({ error: "No autorizado" }, 403);

        const result = await getPlanesAdmin();

        expect(result.planes).toEqual([]);
        expect(result.error).toBe("No autorizado");
    });

    it("DATA-PLANES-ADMIN-003: retorna 'Error de conexión' si fetch falla sin cuerpo JSON", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(null, { status: 500 }),
        );

        const result = await getPlanesAdmin();

        expect(result.planes).toEqual([]);
        expect(result.error).toBe("Error de conexión");
    });
});

describe("createPlanAdmin", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("DATA-PLANES-CREATE-001: crea plan exitosamente", async () => {
        mockFetch({ success: true });

        const result = await createPlanAdmin({ nombre: "Plan", precio: 20000, tokens_mensuales: 10 });

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it("DATA-PLANES-CREATE-002: retorna error si falla", async () => {
        mockFetch({ error: "Error de validación" }, 400);

        const result = await createPlanAdmin({ nombre: "Plan", precio: 20000 });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Error de validación");
    });

    it("DATA-PLANES-CREATE-003: envía dias en el body al crear", async () => {
        mockFetch({ success: true });

        await createPlanAdmin({ nombre: "Plan", precio: 20000, tokens_mensuales: 10, dias: 90 });

        const fetchMock = vi.mocked(globalThis.fetch);
        const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
        expect(body.dias).toBe(90);
    });
});

describe("updatePlanAdmin", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("DATA-PLANES-UPDATE-001: actualiza plan exitosamente", async () => {
        mockFetch({ success: true });

        const result = await updatePlanAdmin({ id: "p1", nombre: "Actualizado" });

        expect(result.success).toBe(true);
    });

    it("DATA-PLANES-UPDATE-002: retorna error si falla", async () => {
        mockFetch({ error: "No encontrado" }, 404);

        const result = await updatePlanAdmin({ id: "p1", nombre: "X" });

        expect(result.success).toBe(false);
        expect(result.error).toBe("No encontrado");
    });
});

describe("setPlanActivo (los planes no se eliminan, se desactivan)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("DATA-PLANES-DEL-001: desactiva con PUT { id, activo: false }", async () => {
        const fetchMock = mockFetch({ success: true });

        const result = await setPlanActivo("p1", false);

        expect(result.success).toBe(true);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/admin/planes");
        expect((init as RequestInit).method).toBe("PUT");
        expect(JSON.parse(String((init as RequestInit).body))).toEqual({ id: "p1", activo: false });
    });

    it("DATA-PLANES-DEL-002: retorna error si falla", async () => {
        mockFetch({ error: "No encontrado" }, 404);

        const result = await setPlanActivo("p1", true);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No encontrado");
    });
});

// ── getUsers ────────────────────────────────────────────

const MOCK_USERS = [
    { id: "u1", nombre: "Alice", rol: "jugador", rut: "11111111-1", telefono: "56911111111" },
    { id: "u2", nombre: "Bob", rol: "jugador", rut: "22222222-2", telefono: "56922222222" },
    { id: "u3", nombre: "Carlos", rol: "profesor", rut: null, telefono: null },
    { id: "u4", nombre: "Diana", rol: "administrador", rut: "33333333-3", telefono: "" },
];

const mockMembresia = (overrides = {}) => ({
    membresia_id: "mem-1",
    usuario_id: "u1",
    plan_id: "plan-1",
    plan_nombre: "Básico",
    tokens_mensuales: 10,
    precio: 15000,
    tokens_totales: 10,
    tokens_usados: 3,
    tokens_restantes: 7,
    estado: true,
    congelada: false,
    sin_tokens: false,
    fecha_congelamiento: null,
    fecha_inicio: "2026-06-01T00:00:00.000Z",
    fecha_vencimiento: "2026-07-01T00:00:00.000Z",
    ...overrides,
});

describe("getUsers", () => {
    beforeEach(() => {
        vi.mocked(getAdminMembresias).mockReset();
        vi.mocked(getAdminMembresias).mockResolvedValue([]);
    });

    it("DATA-GETUSERS-001: retorna estudiantes con membresía combinada", async () => {
        __setTableData("usuario", [MOCK_USERS[0], MOCK_USERS[1]]);
        vi.mocked(getAdminMembresias).mockResolvedValue([mockMembresia({ usuario_id: "u1" })]);

        const result = await getUsers();

        expect(result).toHaveLength(2);
        const alice = result.find((s) => s.name === "Alice")!;
        expect(alice.plan).toBe("Básico");
        expect(alice.tokens).toBe(7);
        expect(alice.status).toBe("Activo");
        expect(alice.rut).toBe("11111111-1");
        expect(alice.phone).toBe("56911111111");

        const bob = result.find((s) => s.name === "Bob")!;
        expect(bob.plan).toBe("Sin plan");
        expect(bob.tokens).toBe(0);
        expect(bob.status).toBe("Inactivo");
    });

    it("DATA-GETUSERS-002: retorna [] si no hay usuarios", async () => {
        __setTableData("usuario", []);
        vi.mocked(getAdminMembresias).mockResolvedValue([]);

        const result = await getUsers();

        expect(result).toEqual([]);
    });

    // GEN-08: antes devolvía [] y la pantalla mostraba "0 registros" sin explicar el error.
    it("DATA-GETUSERS-003: si falla supabase, lanza (la pantalla muestra el error)", async () => {
        __setTableData("usuario", null, { message: "Connection refused" });
        vi.mocked(getAdminMembresias).mockResolvedValue([]);

        await expect(getUsers()).rejects.toThrow("No se pudieron cargar los usuarios");
    });

    it("DATA-GETUSERS-005: un alumno congelado figura 'Congelado' (no 'Activo' con 0 tokens)", async () => {
        __setTableData("usuario", [MOCK_USERS[0]]);
        // Así la entrega /api/admin/membresias: congelada → tokens_restantes 0,
        // pero tokens crudos 2/4 (antes getStatus los usaba y decía "Activo").
        vi.mocked(getAdminMembresias).mockResolvedValue([
            mockMembresia({ usuario_id: "u1", tokens_totales: 4, tokens_usados: 2, tokens_restantes: 0, congelada: true }),
        ]);

        const [alice] = await getUsers();

        expect(alice.status).toBe("Congelado");
        expect(alice.tokens).toBe(0);
    });

    it("DATA-GETUSERS-006: vencida o agotada con tokens crudos de sobra figura 'Vencido', no 'Activo'", async () => {
        __setTableData("usuario", [MOCK_USERS[0]]);
        vi.mocked(getAdminMembresias).mockResolvedValue([
            mockMembresia({ usuario_id: "u1", tokens_totales: 4, tokens_usados: 1, tokens_restantes: 0, estado: false }),
        ]);

        const [alice] = await getUsers();

        expect(alice.status).toBe("Vencido");
    });

    it("DATA-GETUSERS-004: status Activo cuando tokens_restantes > 0, Vencido cuando = 0", async () => {
        __setTableData("usuario", [MOCK_USERS[0], MOCK_USERS[1]]);
        vi.mocked(getAdminMembresias).mockResolvedValue([
            mockMembresia({ usuario_id: "u1", tokens_totales: 10, tokens_usados: 3, tokens_restantes: 7 }),
            mockMembresia({ usuario_id: "u2", tokens_totales: 10, tokens_usados: 10, tokens_restantes: 0 }),
        ]);

        const result = await getUsers();

        expect(result.find((s) => s.name === "Alice")!.status).toBe("Activo");
        expect(result.find((s) => s.name === "Bob")!.status).toBe("Vencido");
    });

    it("DATA-GETUSERS-005: mapea roles correctamente", async () => {
        __setTableData("usuario", MOCK_USERS);
        vi.mocked(getAdminMembresias).mockResolvedValue([]);

        const result = await getUsers();

        expect(result.find((s) => s.name === "Alice")!.role).toBe("Alumno");
        expect(result.find((s) => s.name === "Carlos")!.role).toBe("Profesor");
        expect(result.find((s) => s.name === "Diana")!.role).toBe("Admin");
    });

    it("DATA-GETUSERS-006: convierte null/undefined a string vacío en rut y phone", async () => {
        __setTableData("usuario", [MOCK_USERS[2], MOCK_USERS[3]]);
        vi.mocked(getAdminMembresias).mockResolvedValue([]);

        const result = await getUsers();

        const carlos = result.find((s) => s.name === "Carlos")!;
        expect(carlos.rut).toBe("");
        expect(carlos.phone).toBe("");

        const diana = result.find((s) => s.name === "Diana")!;
        expect(diana.rut).toBe("33333333-3");
        expect(diana.phone).toBe("");
    });
});

describe("columnas de plan pedidas desde el navegador", () => {
    // Regresión de seguridad: plan.codigo_acceso es el secreto del link de planes
    // familiares/liga. La BD revoca su SELECT a usuarios; si el cliente pide "*"
    // o esa columna, la consulta falla (y antes exponía el código).
    it("PLANS-COLS-001: getPlanes y getPlanesLimit no piden '*' ni codigo_acceso", async () => {
        const client = createMockServerClient();
        vi.mocked(createClient).mockReturnValue(client as any);
        __setTableData("plan", MOCK_PLANS);

        await getPlanes();
        await getPlanesLimit(2);

        const chains = (client.from as ReturnType<typeof vi.fn>).mock.results.map((r) => r.value);
        const columnas = chains.flatMap((c) => c.select.mock.calls.map((call: unknown[]) => String(call[0])));
        expect(columnas).toHaveLength(2);
        for (const cols of columnas) {
            expect(cols).not.toBe("*");
            expect(cols).not.toContain("codigo_acceso");
        }
    });
});
