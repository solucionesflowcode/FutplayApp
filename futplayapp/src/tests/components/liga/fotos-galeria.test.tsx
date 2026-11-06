// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import type { LigaFotoVista } from "@/lib/liga-fotos";

const datos = vi.hoisted(() => ({
    getFotosLiga: vi.fn(),
    cambiarMeGusta: vi.fn(),
    getComentariosFoto: vi.fn(),
    comentarFoto: vi.fn(),
    borrarComentarioFoto: vi.fn(),
}));

vi.mock("@/data/ligas", () => datos);

import FotosGaleria from "@/components/liga/FotosGaleria";

const foto: LigaFotoVista = {
    id: "abcdef12-0000-0000-0000-000000000000", liga_id: "l1", partido_id: null,
    url: "https://cdn.test/l1/a.jpg", miniatura_url: "https://cdn.test/l1/a_min.jpg",
    ancho: 800, alto: 600, pie: "Gran final", created_at: "2026-11-06T10:00:00Z",
    me_gusta_total: 2, comentarios_total: 3, me_gusta: false,
};

const mostrar = () => render(<FotosGaleria ligaId="l1" partidos={[]} equipos={[]} />);

afterEach(() => cleanup());

beforeEach(() => {
    vi.clearAllMocks();
    datos.getFotosLiga.mockResolvedValue({ fotos: [foto], siguiente: null });
    datos.getComentariosFoto.mockResolvedValue([]);
});

describe("tarjetas de la galería del jugador", () => {
    it("muestra me gusta, comentarios y descarga sin abrir la foto", async () => {
        mostrar();
        expect(await screen.findByRole("button", { name: "Me gusta (2)" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Comentarios (3)" })).toBeTruthy();
        const descarga = screen.getByRole("link", { name: "Descargar foto" }) as HTMLAnchorElement;
        expect(descarga.href).toBe("https://cdn.test/l1/a.jpg?download=foto-campeonato-abcdef12.jpg");
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("el me gusta se guarda desde la tarjeta con el total del servidor", async () => {
        datos.cambiarMeGusta.mockResolvedValue({ me_gusta: true, total: 7 });
        mostrar();
        fireEvent.click(await screen.findByRole("button", { name: "Me gusta (2)" }));
        expect(await screen.findByRole("button", { name: "Me gusta (7)" })).toBeTruthy();
        expect(datos.cambiarMeGusta).toHaveBeenCalledWith(foto.id, true);
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("si el me gusta falla, lo revierte y muestra el error", async () => {
        datos.cambiarMeGusta.mockRejectedValue(new Error("Sin conexión"));
        mostrar();
        fireEvent.click(await screen.findByRole("button", { name: "Me gusta (2)" }));
        expect((await screen.findByRole("alert")).textContent).toBe("Sin conexión");
        const boton = screen.getByRole("button", { name: "Me gusta (2)" });
        expect(boton.getAttribute("aria-pressed")).toBe("false");
    });

    it("el botón de comentarios abre la foto con el foco en el campo para escribir", async () => {
        mostrar();
        fireEvent.click(await screen.findByRole("button", { name: "Comentarios (3)" }));
        expect(await screen.findByRole("dialog")).toBeTruthy();
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Escribe un comentario" })));
    });

    it("hacer clic en la imagen abre la foto con el foco en cerrar", async () => {
        mostrar();
        fireEvent.click(await screen.findByRole("button", { name: "Ver foto: Gran final" }));
        await screen.findByRole("dialog");
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" })));
    });
});
