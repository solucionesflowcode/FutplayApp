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

import { POST } from "@/app/api/admin/upload/route";

function makeRequest(url: string, opts?: RequestInit): Request {
    return new Request(url, opts);
}

describe("POST /api/admin/upload", () => {
    beforeEach(() => {
        __resetMocks();
    });

    it("API-ADM-UPLOAD-001: sube archivo exitosamente", async () => {
        const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "profesores");

        const res = await POST(makeRequest("http://localhost:3000/api/admin/upload", {
            method: "POST",
            body: formData,
        }));

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toHaveProperty("url");
    });

    it("API-ADM-UPLOAD-002: retorna 400 si no se envía archivo", async () => {
        const formData = new FormData();
        formData.append("bucket", "profesores");

        const res = await POST(makeRequest("http://localhost:3000/api/admin/upload", {
            method: "POST",
            body: formData,
        }));

        expect(res.status).toBe(400);
    });

    it("API-ADM-UPLOAD-003: retorna 400 si formato no permitido", async () => {
        const file = new File(["test"], "test.pdf", { type: "application/pdf" });
        const formData = new FormData();
        formData.append("file", file);

        const res = await POST(makeRequest("http://localhost:3000/api/admin/upload", {
            method: "POST",
            body: formData,
        }));

        expect(res.status).toBe(400);
    });
});
