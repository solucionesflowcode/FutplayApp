import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => createMockServerClient()),
}));

vi.mock("@/utils/supabase/admin", () => ({
    verifyAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", email: "admin@test.cl" })),
}));

import { verifyAdmin } from "@/utils/supabase/admin";
import { GET, POST, PUT, DELETE, PATCH } from "@/app/api/admin/clases/route";

const TEST_CLASES = [
    { id: "c1", titulo: "Clase A", descripcion: "Desc A", sede_id: "s1", cupo_maximo: 15, profesor_id: "p1", created_at: "2026-01-01", fecha_hora: "2026-06-15T10:00:00Z" },
    { id: "c2", titulo: "Clase B", descripcion: "Desc B", sede_id: "s2", cupo_maximo: 20, profesor_id: null, created_at: "2026-01-02", fecha_hora: "2026-06-16T14:00:00Z" },
];
const TEST_SEDES = [
    { id: "s1", nombre: "Sede Centro" },
    { id: "s2", nombre: "Sede Norte" },
];

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/clases", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-CLASES-GET-001: retorna 403 si el usuario no es admin", async () => {
        vi.mocked(verifyAdmin).mockResolvedValueOnce(null);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases"));

        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe("No autorizado");
    });

    it("API-ADM-CLASES-GET-002: retorna lista completa con joins", async () => {
        __setTableData("clase", TEST_CLASES);
        __setTableData("sede", TEST_SEDES);
        __setTableData("usuario", [{ id: "p1", nombre: "Profesor" }]);
        __setTableData("clase_usuario", [{ clase_id: "c1" }, { clase_id: "c1" }]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBe(2);
        expect(json[0]).toHaveProperty("sede_nombre");
        expect(json[0]).toHaveProperty("inscritos");
    });

    it("API-ADM-CLASES-GET-003: ?tipo=sedes retorna sedes", async () => {
        __setTableData("sede", TEST_SEDES);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases?tipo=sedes"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveLength(2);
        expect(json[0].nombre).toBe("Sede Centro");
    });

    it("API-ADM-CLASES-GET-004: ?tipo=asistencia-general retorna con nombres", async () => {
        __setTableData("clase_usuario", [
            { id: "cu1", asistencia: "asistio", clase_id: "c1", usuario_id: "u1" },
        ]);
        __setTableData("clase", [{ id: "c1", titulo: "Clase A" }]);
        __setTableData("usuario", [{ id: "u1", nombre: "Juan Pérez" }]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases?tipo=asistencia-general"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json[0]).toHaveProperty("clase_titulo");
        expect(json[0]).toHaveProperty("usuario_nombre");
    });

    it("API-ADM-CLASES-GET-005: ?tipo=asistencia sin clase_id retorna 400", async () => {
        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases?tipo=asistencia"));

        expect(res.status).toBe(400);
    });

    it("API-ADM-CLASES-GET-005: ?tipo=asistencia con clase_id retorna 200", async () => {
        __setTableData("clase", { id: "c1", titulo: "Clase A", fecha_hora: "2026-06-15T10:00:00Z" });
        __setTableData("clase_usuario", [{ id: "cu1", usuario_id: "u1", asistencia: "asistio" }]);
        __setTableData("usuario", [{ id: "u1", nombre: "Juan" }]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/clases?tipo=asistencia&clase_id=c1"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty("clase");
        expect(json).toHaveProperty("inscripciones");
    });
});

describe("POST /api/admin/clases", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-CLASES-POST-001: retorna 400 si faltan campos requeridos", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Solo título" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("sede_id");
    });

    it("API-ADM-CLASES-POST-002: crea clase exitosamente", async () => {
        __setTableData("clase", { id: "c-new", titulo: "Nueva Clase", sede_id: "s1" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Nueva Clase", sede_id: "s1", cupo_maximo: 15 }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBe("c-new");
    });

    it("API-ADM-CLASES-POST-003: usa horarios[0] como fecha_hora si se provee", async () => {
        __setTableData("clase", { id: "c-legacy" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Legacy", sede_id: "s1", horarios: ["2026-07-01T09:00:00Z"] }),
        }));

        expect(res.status).toBe(200);
    });
});

describe("PUT /api/admin/clases", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-CLASES-PUT-001: retorna 400 si falta id", async () => {
        const res = await PUT(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Nuevo título" }),
        }));

        expect(res.status).toBe(400);
    });

    it("API-ADM-CLASES-PUT-002: actualiza campos enviados", async () => {
        __setTableData("clase", { id: "c1" });

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "c1", titulo: "Título actualizado", cupo_maximo: 25 }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });
});

describe("DELETE /api/admin/clases", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-CLASES-DEL-001: elimina clase y retorna tokens devueltos", async () => {
        __setTableData("clase", { id: "c1" });
        __setTableData("clase_usuario", [{ usuario_id: "u1" }, { usuario_id: "u1" }]);

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/clases?id=c1"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.tokens_devueltos).toBe(2);
    });
});

describe("PATCH /api/admin/clases", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-CLASES-PATCH-001: registrar-asistencia upsert crea si no existe", async () => {
        __setTableData("clase_usuario", null);

        const res = await PATCH(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "registrar-asistencia", clase_id: "c1", usuario_id: "u1", asistencia: true }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
    });

    it("API-ADM-CLASES-PATCH-002: retorna 400 para acción inválida", async () => {
        const res = await PATCH(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "algo-raro" }),
        }));

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toContain("Acción no válida");
    });

    it("API-ADM-CLASES-PATCH-003: retorna 400 si faltan clase_id o usuario_id", async () => {
        const res = await PATCH(makeRequest("http://localhost:3000/api/admin/clases", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accion: "registrar-asistencia" }),
        }));

        expect(res.status).toBe(400);
    });
});
