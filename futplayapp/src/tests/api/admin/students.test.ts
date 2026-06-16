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

import { POST } from "@/app/api/admin/students/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("POST /api/admin/students", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-STUDENTS-POST-001: crea estudiante exitosamente", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "nuevo@test.cl", nombre: "Nuevo Estudiante", rol: "jugador" }),
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.user.email).toBe("nuevo@test.cl");
        expect(json.user.rol).toBe("jugador");
    });

    it("API-ADM-STUDENTS-POST-002: retorna 400 si faltan campos requeridos", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "incompleto@test.cl" }),
        }));

        expect(res.status).toBe(400);
    });

    it("API-ADM-STUDENTS-POST-003: retorna 400 si rol es inválido", async () => {
        const res = await POST(makeRequest("http://localhost:3000/api/admin/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@test.cl", nombre: "Admin", rol: "administrador" }),
        }));

        expect(res.status).toBe(400);
    });
});
