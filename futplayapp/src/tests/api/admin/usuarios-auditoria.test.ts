import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData } from "@/tests/mocks/supabase";

// Pruebas de los arreglos de la auditoría 2026-10 sobre las rutas admin de
// alumnos y profesores: borrado seguro y sincronización del email con auth.

beforeAll(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterAll(() => {
    vi.unstubAllEnvs();
});

const ref = vi.hoisted(() => ({ client: null as unknown as ReturnType<typeof import("@/tests/mocks/supabase").createMockServerClient> & { auth: { admin: Record<string, ReturnType<typeof vi.fn>> } } }));

vi.mock("next/headers", () => ({
    cookies: vi.fn(() => Promise.resolve({ getAll: () => [] })),
}));

vi.mock("@/utils/supabase/admin", () => ({
    verifyAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", email: "admin@test.cl" })),
    getAdminClient: vi.fn(() => Promise.resolve(ref.client)),
}));

import { PUT as PUT_STUDENT, DELETE as DELETE_STUDENT } from "@/app/api/admin/students/route";
import { PUT as PUT_PROFESOR } from "@/app/api/admin/profesores/route";
import { POST as POST_STATUS } from "@/app/api/admin/students/status/route";

function req(url: string, method: string, body?: object): Request {
    return new Request(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
    });
}

function tablasTocadas(method: "delete" | "update"): string[] {
    const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;
    return fromSpy.mock.calls
        .map((call: unknown[], i: number) => ({ table: call[0] as string, chain: fromSpy.mock.results[i].value }))
        .filter(({ chain }) => chain[method].mock.calls.length > 0)
        .map(({ table }) => table);
}

describe("DELETE /api/admin/students", () => {
    beforeEach(() => {
        __resetMocks();
        ref.client = createMockServerClient() as typeof ref.client;
    });

    it("USR-DEL-001: alumno con pagos → 409 y NO borra nada", async () => {
        // Antes se borraban membresía, inscripciones y ficha y luego fallaba
        // al borrar boletas (boleta_item sin cascade): datos a medias.
        __setTableData("boleta", [{ id: "b1", usuario_id: "u1" }]);

        const res = await DELETE_STUDENT(req("http://localhost:3000/api/admin/students?id=u1", "DELETE"));

        expect(res.status).toBe(409);
        expect(tablasTocadas("delete")).toEqual([]);
        expect(ref.client.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it("USR-DEL-002: alumno sin pagos → borra auth.users (cascadea) y la fila de usuario", async () => {
        __setTableData("boleta", []);

        const res = await DELETE_STUDENT(req("http://localhost:3000/api/admin/students?id=u1", "DELETE"));

        expect(res.status).toBe(200);
        expect(ref.client.auth.admin.deleteUser).toHaveBeenCalledWith("u1");
        expect(tablasTocadas("delete")).toEqual(["recurrencia", "usuario"]);
    });

    it("USR-DEL-003: si falla el borrado en auth responde 500 sin borrar la fila de usuario", async () => {
        __setTableData("boleta", []);
        ref.client.auth.admin.deleteUser = vi.fn(() => Promise.resolve({ error: { status: 500, message: "boom" } })) as never;

        const res = await DELETE_STUDENT(req("http://localhost:3000/api/admin/students?id=u1", "DELETE"));

        expect(res.status).toBe(500);
        expect(tablasTocadas("delete")).not.toContain("usuario");
    });
});

describe("Edición de email sincroniza auth.users", () => {
    beforeEach(() => {
        __resetMocks();
        ref.client = createMockServerClient() as typeof ref.client;
        ref.client.auth.admin.updateUserById = vi.fn(() => Promise.resolve({ data: {}, error: null }));
    });

    it("USR-EMAIL-001: PUT alumno con email actualiza auth.users (normalizado) y usuario", async () => {
        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", email: " Nuevo@Mail.CL " }));

        expect(res.status).toBe(200);
        expect(ref.client.auth.admin.updateUserById).toHaveBeenCalledWith("u1", { email: "nuevo@mail.cl", email_confirm: true });
        expect(tablasTocadas("update")).toEqual(["usuario"]);
    });

    it("USR-EMAIL-002: si auth rechaza el email no se actualiza la tabla usuario", async () => {
        ref.client.auth.admin.updateUserById = vi.fn(() => Promise.resolve({ data: null, error: { status: 422, message: "email_exists" } }));

        const res = await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", email: "dup@mail.cl" }));

        expect(res.status).toBe(500);
        expect(tablasTocadas("update")).toEqual([]);
    });

    it("USR-EMAIL-003: PUT alumno sin email no toca auth.users", async () => {
        await PUT_STUDENT(req("http://localhost:3000/api/admin/students", "PUT", { id: "u1", nombre: "Otro" }));

        expect(ref.client.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it("USR-EMAIL-004: PUT profesor con email también sincroniza auth.users", async () => {
        const res = await PUT_PROFESOR(req("http://localhost:3000/api/admin/profesores", "PUT", { id: "p1", email: "profe@mail.cl" }));

        expect(res.status).toBe(200);
        expect(ref.client.auth.admin.updateUserById).toHaveBeenCalledWith("p1", { email: "profe@mail.cl", email_confirm: true });
    });
});

describe("POST /api/admin/students/status — Activo", () => {
    beforeEach(() => {
        __resetMocks();
        ref.client = createMockServerClient() as typeof ref.client;
    });

    it("USR-STATUS-001: 'Activo' reactiva la membresía (estado=true, sin_tokens=false), no solo los tokens", async () => {
        // Antes solo ponía tokens_usados=0: la membresía seguía cerrada y el
        // alumno figuraba "Activo" sin poder reservar.
        __setTableData("membresia", [{ id: "m1", usuario_id: "u1", tokens_totales: 4, tokens_usados: 4, estado: false, sin_tokens: true }]);
        const fromSpy = ref.client.from as ReturnType<typeof vi.fn>;

        const res = await POST_STATUS(req("http://localhost:3000/api/admin/students/status", "POST", { userId: "u1", status: "Activo" }));

        expect(res.status).toBe(200);
        const updates = fromSpy.mock.results
            .map((r) => r.value.update.mock.calls as unknown[][])
            .flat()
            .map((c: unknown[]) => c[0]);
        expect(updates).toEqual([{ tokens_usados: 0, estado: true, sin_tokens: false }]);
    });
});
