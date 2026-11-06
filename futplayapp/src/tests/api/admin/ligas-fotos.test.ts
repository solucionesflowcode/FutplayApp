import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";

const storage = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));

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

vi.mock("@supabase/supabase-js", () => ({
    createClient: vi.fn(() => ({
        ...createMockServerClient(),
        storage: {
            from: () => ({
                upload: storage.upload,
                remove: storage.remove,
                getPublicUrl: (ruta: string) => ({ data: { publicUrl: `https://cdn.test/${ruta}` } }),
            }),
        },
    })),
}));

import { GET, POST, PUT, DELETE } from "@/app/api/admin/ligas/fotos/route";
import { DELETE as DELETE_LIGA } from "@/app/api/admin/ligas/route";

const URL_BASE = "http://localhost:3000/api/admin/ligas/fotos";
const LIGA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const PARTIDO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const PARTIDO_OTRA = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const FOTO = "dddddddd-dddd-dddd-dddd-dddddddddddd";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

function formulario(campos: Record<string, string> = {}, foto: File | null = new File([JPEG], "foto.jpg", { type: "image/jpeg" })) {
    const form = new FormData();
    form.append("liga_id", LIGA);
    form.append("ancho", "2000");
    form.append("alto", "1500");
    if (foto) form.append("foto", foto);
    form.append("miniatura", new File([JPEG], "min.jpg", { type: "image/jpeg" }));
    for (const [k, v] of Object.entries(campos)) form.set(k, v);
    return form;
}

const subir = (form: FormData) => POST(new Request(URL_BASE, { method: "POST", body: form }));

const filaFoto = { id: FOTO, liga_id: LIGA, partido_id: null, ruta: `${LIGA}/x.jpg`, ruta_miniatura: `${LIGA}/x_min.jpg`, ancho: 2000, alto: 1500, pie: null, created_at: "2026-11-06T10:00:00Z" };

beforeEach(() => {
    __resetMocks();
    storage.upload.mockReset().mockResolvedValue({ error: null });
    storage.remove.mockReset().mockResolvedValue({ data: [], error: null });
    __setAuthUser({ id: "admin-1" });
    __setTableData("usuario", [{ id: "admin-1", rol: "administrador" }]);
    __setTableData("liga", [{ id: LIGA, estado: "en_curso" }]);
    __setTableData("liga_partido", [{ id: PARTIDO, liga_id: LIGA }, { id: PARTIDO_OTRA, liga_id: "otra" }]);
    __setTableData("liga_foto", [filaFoto]);
});

describe("fotos de la liga: admin", () => {
    it("API-ADM-FOTOS-001: 403 en todas las operaciones si no es administrador", async () => {
        __setAuthUser({ id: "u1" });
        __setTableData("usuario", [{ id: "u1", rol: "jugador" }]);
        expect((await GET(new Request(`${URL_BASE}?liga_id=${LIGA}`))).status).toBe(403);
        expect((await subir(formulario())).status).toBe(403);
        expect((await PUT(new Request(URL_BASE, { method: "PUT", body: JSON.stringify({ id: FOTO }) }))).status).toBe(403);
        expect((await DELETE(new Request(`${URL_BASE}?id=${FOTO}`))).status).toBe(403);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it("API-ADM-FOTOS-002: sube la foto y su miniatura dentro de la carpeta de la liga", async () => {
        const res = await subir(formulario());
        expect(res.status).toBe(200);
        expect(storage.upload).toHaveBeenCalledTimes(2);
        const [ruta, , opciones] = storage.upload.mock.calls[0];
        expect(ruta).toMatch(new RegExp(`^${LIGA}/[0-9a-f-]+\\.jpg$`));
        expect(opciones.contentType).toBe("image/jpeg");
        expect((await res.json()).url).toContain("https://cdn.test/");
    });

    it("API-ADM-FOTOS-003: rechaza un formato no permitido o un archivo disfrazado", async () => {
        const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", { type: "image/png" });
        expect((await subir(formulario({}, png))).status).toBe(400);
        const disfrazado = new File(["<script>alert(1)</script>"], "a.jpg", { type: "image/jpeg" });
        expect((await subir(formulario({}, disfrazado))).status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it("API-ADM-FOTOS-004: rechaza un archivo de más de 4 MB", async () => {
        const grande = new Uint8Array(4 * 1024 * 1024 + 1);
        grande.set(JPEG);
        const res = await subir(formulario({}, new File([grande], "g.jpg", { type: "image/jpeg" })));
        expect(res.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it("API-ADM-FOTOS-005: rechaza un partido de otra liga al subir y al editar", async () => {
        expect((await subir(formulario({ partido_id: PARTIDO_OTRA }))).status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
        const res = await PUT(new Request(URL_BASE, { method: "PUT", body: JSON.stringify({ id: FOTO, partido_id: PARTIDO_OTRA }) }));
        expect(res.status).toBe(400);
    });

    it("API-ADM-FOTOS-006: acepta un partido de la liga y volver a foto general", async () => {
        expect((await subir(formulario({ partido_id: PARTIDO }))).status).toBe(200);
        const res = await PUT(new Request(URL_BASE, { method: "PUT", body: JSON.stringify({ id: FOTO, partido_id: null, pie: "Final" }) }));
        expect(res.status).toBe(200);
    });

    it("API-ADM-FOTOS-007: una liga_id inválida no llega a la ruta del bucket", async () => {
        expect((await subir(formulario({ liga_id: "../otra" }))).status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
    });

    it("API-ADM-FOTOS-008: si falla la miniatura, borra la foto ya subida", async () => {
        storage.upload.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "falló" } });
        expect((await subir(formulario())).status).toBe(500);
        expect(storage.remove).toHaveBeenCalledTimes(1);
        expect(storage.remove.mock.calls[0][0]).toHaveLength(1);
    });

    it("API-ADM-FOTOS-009: si falla el insert, no deja archivos", async () => {
        __setTableData("liga_foto", [filaFoto], { message: "falló" });
        expect((await subir(formulario())).status).toBe(500);
        expect(storage.remove).toHaveBeenCalledTimes(1);
        expect(storage.remove.mock.calls[0][0]).toHaveLength(2);
    });

    it("API-ADM-FOTOS-010: rechaza un pie demasiado largo", async () => {
        const res = await PUT(new Request(URL_BASE, { method: "PUT", body: JSON.stringify({ id: FOTO, pie: "a".repeat(201) }) }));
        expect(res.status).toBe(400);
    });

    it("API-ADM-FOTOS-011: al borrar una foto se eliminan sus dos archivos", async () => {
        expect((await DELETE(new Request(`${URL_BASE}?id=${FOTO}`))).status).toBe(200);
        expect(storage.remove).toHaveBeenCalledWith([filaFoto.ruta, filaFoto.ruta_miniatura]);
    });

    it("API-ADM-FOTOS-012: al borrar una liga se eliminan los archivos de sus fotos", async () => {
        const res = await DELETE_LIGA(new Request(`http://localhost:3000/api/admin/ligas?id=${LIGA}`));
        expect(res.status).toBe(200);
        expect(storage.remove).toHaveBeenCalledWith([filaFoto.ruta, filaFoto.ruta_miniatura]);
    });
});
