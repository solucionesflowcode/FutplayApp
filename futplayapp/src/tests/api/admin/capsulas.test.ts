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

import { GET, POST, PUT, DELETE } from "@/app/api/admin/capsulas/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("GET /api/admin/capsulas", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna lista de cápsulas con modulo_nombre y profesor_nombre", async () => {
        __setTableData("capsula", [
            { id: "cap1", titulo: "Cápsula 1", modulo_id: "m1", profesor_id: "p1", imagen: "", creado: "", duracion: "00:10:00", bunny_video_id: null, order_index: 1, descripcion: null },
        ]);
        __setTableData("modulo", [{ id: "m1", nombre: "Módulo 1" }]);
        __setTableData("usuario", [
            { id: "p1", nombre: "Profesor 1" },
        ]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/capsulas"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json[0].modulo_nombre).toBe("Módulo 1");
        expect(json[0].profesor_nombre).toBe("Profesor 1");
    });

    it("?tipo=modulos retorna lista de módulos para dropdown", async () => {
        __setTableData("modulo", [{ id: "m1", nombre: "Táctica" }]);

        const res = await GET(makeRequest("http://localhost:3000/api/admin/capsulas?tipo=modulos"));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json[0].nombre).toBe("Táctica");
    });
});

describe("POST /api/admin/capsulas", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna 400 si falta título", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/capsulas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modulo_id: "m1" }),
        }));

        expect(res.status).toBe(400);
    });

    it("crea cápsula exitosamente", async () => {
        __setTableData("capsula", { id: "cap-new", titulo: "Nueva" });

        const res = await POST(makeRequest("http://localhost:3000/api/admin/capsulas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Nueva Cápsula", modulo_id: "m1", duracion: "00:15:00" }),
        }));

        expect(res.status).toBe(200);
        expect((await res.json()).id).toBe("cap-new");
    });
});

describe("PUT /api/admin/capsulas", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("retorna 400 si falta id", async () => {
        const res = await PUT(makeRequest("http://localhost:3000/api/admin/capsulas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: "Test" }),
        }));

        expect(res.status).toBe(400);
    });

    it("actualiza cápsula exitosamente", async () => {
        __setTableData("capsula", { id: "cap1" });

        const res = await PUT(makeRequest("http://localhost:3000/api/admin/capsulas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: "cap1", titulo: "Actualizado", descripcion: "Nueva desc" }),
        }));

        expect(res.status).toBe(200);
    });
});

describe("DELETE /api/admin/capsulas", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("elimina cápsula exitosamente", async () => {
        __setTableData("capsula", { id: "cap1" });

        const res = await DELETE(makeRequest("http://localhost:3000/api/admin/capsulas?id=cap1"));

        expect(res.status).toBe(200);
        expect((await res.json()).success).toBe(true);
    });
});
