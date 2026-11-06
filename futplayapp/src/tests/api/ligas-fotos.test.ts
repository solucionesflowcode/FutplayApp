import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
import { createMockServerClient, __resetMocks, __setTableData, __setAuthUser } from "@/tests/mocks/supabase";
import { resetRateLimit } from "@/lib/rate-limit";

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
    createClient: vi.fn(() => createMockServerClient()),
}));

import { GET as GET_FOTOS } from "@/app/api/ligas/fotos/route";
import { POST as DAR_ME_GUSTA, DELETE as QUITAR_ME_GUSTA } from "@/app/api/ligas/fotos/[id]/reaccion/route";
import { GET as GET_COMENTARIOS, POST as POST_COMENTARIO } from "@/app/api/ligas/fotos/[id]/comentarios/route";
import { DELETE as DELETE_COMENTARIO } from "@/app/api/ligas/fotos/comentarios/[id]/route";

const BASE = "http://localhost:3000/api/ligas/fotos";
const LIGA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BORRADOR = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EQ_A = "11111111-1111-1111-1111-111111111111";
const EQ_B = "22222222-2222-2222-2222-222222222222";
const FOTO = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const FOTO_BORRADOR = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const COMENTARIO = "ffffffff-ffff-ffff-ffff-ffffffffffff";

const contexto = (id: string) => ({ params: Promise.resolve({ id }) });

function foto(n: number, extra: object = {}) {
    const id = `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
    return { id, liga_id: LIGA, partido_id: null, ruta: `${LIGA}/${n}.jpg`, ruta_miniatura: `${LIGA}/${n}_min.jpg`, ancho: 100, alto: 100, pie: null, created_at: `2026-11-06T10:${String(n % 60).padStart(2, "0")}:00Z`, ...extra };
}

beforeEach(() => {
    __resetMocks();
    resetRateLimit();
    __setAuthUser({ id: "yo" });
    __setTableData("usuario", [{ id: "yo", rol: "jugador" }]);
    __setTableData("liga", [{ id: LIGA, estado: "en_curso" }, { id: BORRADOR, estado: "borrador" }]);
    __setTableData("liga_partido", [
        { id: "p1", liga_id: LIGA, fase: "regular", jornada: 1, local_id: EQ_A, visita_id: EQ_B },
        { id: "p2", liga_id: LIGA, fase: "regular", jornada: 2, local_id: EQ_B, visita_id: EQ_A },
    ]);
    __setTableData("liga_foto", [
        foto(1, { id: FOTO, partido_id: "p1", pie: "Gol de Juan" }),
        foto(2, { partido_id: "p2" }),
        foto(3),
        foto(4, { id: FOTO_BORRADOR, liga_id: BORRADOR }),
    ]);
    __setTableData("liga_foto_reaccion", [{ foto_id: FOTO, usuario_id: "yo" }, { foto_id: FOTO, usuario_id: "otro" }]);
    __setTableData("liga_foto_comentario", [
        { id: COMENTARIO, foto_id: FOTO, usuario_id: "otro", texto: "Golazo", created_at: "2026-11-06T11:00:00Z", usuario: { nombre: "Otro", foto_url: null, email: "otro@x.cl", rut: "2-7", telefono: "+568" } },
    ]);
});

const fotos = async (query: string) => (await GET_FOTOS(new Request(`${BASE}?liga_id=${LIGA}${query}`))).json();

describe("galería de fotos del jugador", () => {
    it("API-FOTOS-001: 401 sin sesión en todas las rutas", async () => {
        __setAuthUser(null);
        expect((await GET_FOTOS(new Request(`${BASE}?liga_id=${LIGA}`))).status).toBe(401);
        expect((await DAR_ME_GUSTA(new Request(BASE), contexto(FOTO))).status).toBe(401);
        expect((await GET_COMENTARIOS(new Request(BASE), contexto(FOTO))).status).toBe(401);
        expect((await POST_COMENTARIO(new Request(BASE, { method: "POST", body: JSON.stringify({ texto: "hola" }) }), contexto(FOTO))).status).toBe(401);
        expect((await DELETE_COMENTARIO(new Request(BASE), contexto(COMENTARIO))).status).toBe(401);
    });

    it("API-FOTOS-002: una liga en borrador no se muestra ni acepta interacción", async () => {
        expect((await GET_FOTOS(new Request(`${BASE}?liga_id=${BORRADOR}`))).status).toBe(404);
        expect((await DAR_ME_GUSTA(new Request(BASE), contexto(FOTO_BORRADOR))).status).toBe(404);
        expect((await GET_COMENTARIOS(new Request(BASE), contexto(FOTO_BORRADOR))).status).toBe(404);
        expect((await POST_COMENTARIO(new Request(BASE, { method: "POST", body: JSON.stringify({ texto: "hola" }) }), contexto(FOTO_BORRADOR))).status).toBe(404);
    });

    it("API-FOTOS-003: lista las fotos de la liga, de la más nueva a la más antigua, con contadores", async () => {
        const body = await fotos("");
        expect(body.fotos).toHaveLength(3);
        expect(body.fotos[0].created_at > body.fotos[2].created_at).toBe(true);
        const conDatos = body.fotos.find((f: { id: string }) => f.id === FOTO);
        expect(conDatos).toMatchObject({ pie: "Gol de Juan", me_gusta_total: 2, me_gusta: true, comentarios_total: 1 });
        expect(body.siguiente).toBeNull();
    });

    it("API-FOTOS-004: filtra por jornada, equipo y solo generales", async () => {
        const ids = (b: { fotos: { partido_id: string | null }[] }) => b.fotos.map((f) => f.partido_id);
        expect(ids(await fotos("&jornada=2"))).toEqual(["p2"]);
        expect(ids(await fotos("&generales=1"))).toEqual([null]);
        expect((await fotos(`&equipo_id=${EQ_A}`)).fotos).toHaveLength(2);
        expect((await fotos("&jornada=99")).fotos).toEqual([]);
    });

    it("API-FOTOS-005: pagina de a 24 sin repetir fotos", async () => {
        __setTableData("liga_foto", Array.from({ length: 30 }, (_, i) => foto(i + 1)));
        const primera = await fotos("");
        expect(primera.fotos).toHaveLength(24);
        expect(primera.siguiente).toBe(primera.fotos[23].created_at);

        const segunda = await fotos(`&cursor=${encodeURIComponent(primera.siguiente)}`);
        expect(segunda.fotos).toHaveLength(6);
        expect(segunda.siguiente).toBeNull();
        const todas = [...primera.fotos, ...segunda.fotos].map((f: { id: string }) => f.id);
        expect(new Set(todas).size).toBe(30);
    });

    it("API-FOTOS-006: no expone las rutas internas ni quién subió la foto", async () => {
        const body = await fotos("");
        expect(body.fotos[0]).not.toHaveProperty("ruta");
        expect(body.fotos[0]).not.toHaveProperty("subida_por");
    });
});

describe("me gusta", () => {
    it("API-FOTOS-007: darlo y quitarlo responde el estado y el total", async () => {
        const dar = await DAR_ME_GUSTA(new Request(BASE), contexto(FOTO));
        expect(await dar.json()).toEqual({ me_gusta: true, total: 2 });
        const quitar = await QUITAR_ME_GUSTA(new Request(BASE), contexto(FOTO));
        expect((await quitar.json()).me_gusta).toBe(false);
    });
});

describe("comentarios", () => {
    const comentar = (texto: unknown) => POST_COMENTARIO(new Request(BASE, { method: "POST", body: JSON.stringify({ texto }) }), contexto(FOTO));

    it("API-FOTOS-008: no expone email, RUT, teléfono ni usuario_id del autor", async () => {
        const res = await GET_COMENTARIOS(new Request(BASE), contexto(FOTO));
        const [c] = await res.json();
        expect(c).toEqual({ id: COMENTARIO, texto: "Golazo", created_at: "2026-11-06T11:00:00Z", autor: { nombre: "Otro", foto_url: null }, propio: false });
    });

    it("API-FOTOS-009: rechaza un comentario vacío o demasiado largo", async () => {
        expect((await comentar("   ")).status).toBe(400);
        expect((await comentar("a".repeat(501))).status).toBe(400);
    });

    it("API-FOTOS-010: limita los comentarios por minuto", async () => {
        for (let i = 0; i < 10; i++) expect((await comentar("hola")).status).toBe(200);
        expect((await comentar("hola")).status).toBe(429);
    });

    it("API-FOTOS-011: no se puede borrar un comentario ajeno", async () => {
        expect((await DELETE_COMENTARIO(new Request(BASE), contexto(COMENTARIO))).status).toBe(403);
    });

    it("API-FOTOS-012: el autor y un admin sí pueden borrarlo", async () => {
        __setAuthUser({ id: "otro" });
        __setTableData("usuario", [{ id: "otro", rol: "jugador" }]);
        expect((await DELETE_COMENTARIO(new Request(BASE), contexto(COMENTARIO))).status).toBe(200);

        __setAuthUser({ id: "admin-1" });
        __setTableData("usuario", [{ id: "admin-1", rol: "administrador" }]);
        expect((await DELETE_COMENTARIO(new Request(BASE), contexto(COMENTARIO))).status).toBe(200);
    });
});
