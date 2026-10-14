// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

vi.mock("@/data/capsulas-admin", () => ({
    getCapsulasAdmin: vi.fn(),
    getModulosOptions: vi.fn(),
    createCapsula: vi.fn(),
    updateCapsula: vi.fn(),
    deleteCapsula: vi.fn(),
    descartarVideoSubido: vi.fn(),
    setCapsulaDestacada: vi.fn(),
}));
vi.mock("@/data/profesores", () => ({ getProfesoresDropdown: vi.fn() }));
vi.mock("@/data/documentos-admin", () => ({
    getDocumentosByCapsula: vi.fn(),
    createDocumento: vi.fn(),
    deleteDocumento: vi.fn(),
}));

import {
    getCapsulasAdmin,
    getModulosOptions,
    updateCapsula,
    deleteCapsula,
    descartarVideoSubido,
} from "@/data/capsulas-admin";
import { getProfesoresDropdown } from "@/data/profesores";
import { getDocumentosByCapsula, deleteDocumento } from "@/data/documentos-admin";
import { ToastProvider } from "@/components/admin/ui";
import CapsulasPage from "@/app/(admin)/admin/capsulas/page";

const VIDEO = "11111111-2222-3333-4444-555555555555";
const CAPSULAS = [
    {
        id: "k1", titulo: "Regate", imagen: "https://cdn/regate.jpg", creado: "Coach Ana", duracion: "00:10:00",
        modulo_id: "m1", modulo_nombre: "Técnica", profesor_id: "pr1", profesor_nombre: "Ana",
        bunny_video_id: VIDEO, order_index: 2, descripcion: "Uno contra uno", destacada: false,
    },
];

/** XHR falso: la subida queda pendiente hasta que el test la termine o se aborte. */
class FakeXHR {
    static ultimo: FakeXHR | null = null;
    upload: { onprogress?: (e: unknown) => void } = {};
    onload?: () => void;
    onerror?: () => void;
    onabort?: () => void;
    status = 0;
    responseText = "";
    abort = vi.fn(() => this.onabort?.());
    open() {}
    send() { FakeXHR.ultimo = this; }
}

const tabla = () => screen.getByRole("table", { name: "Cápsulas" });

function renderPagina() {
    return render(<ToastProvider><CapsulasPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getCapsulasAdmin).mockResolvedValue(structuredClone(CAPSULAS));
    vi.mocked(getModulosOptions).mockResolvedValue([{ id: "m1", nombre: "Técnica", categoria_id: null }, { id: "m2", nombre: "Táctica", categoria_id: null }]);
    vi.mocked(getProfesoresDropdown).mockResolvedValue([{ id: "pr1", nombre: "Ana" }]);
    vi.mocked(getDocumentosByCapsula).mockResolvedValue([]);
    FakeXHR.ultimo = null;
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ videoId: "vid-nuevo" }) })));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
});

async function abrirEdicion() {
    renderPagina();
    await within(tabla()).findByText("Regate");
    fireEvent.click(within(tabla()).getByRole("button", { name: "Editar Regate" }));
    return screen.getByRole("dialog", { name: "Editar cápsula" });
}

const siguiente = (modal: HTMLElement) => fireEvent.click(within(modal).getByRole("button", { name: /Siguiente/ }));

describe("Gestión de cápsulas (fase 3)", () => {
    it("ADM-CAP-UI-001: los opcionales vaciados se envían como null y la tabla se actualiza (CAP-03/04)", async () => {
        vi.mocked(updateCapsula).mockResolvedValue({ success: true });
        const modal = await abrirEdicion();

        fireEvent.change(within(modal).getByLabelText(/Descripción/), { target: { value: "" } });
        fireEvent.change(within(modal).getByLabelText(/Coach/), { target: { value: "" } });
        fireEvent.change(within(modal).getByLabelText(/^Módulo/), { target: { value: "m2" } });
        fireEvent.change(within(modal).getByLabelText(/^Profesor/), { target: { value: "" } });
        siguiente(modal);
        siguiente(modal);
        fireEvent.change(within(modal).getByLabelText(/Duración/), { target: { value: "" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        await screen.findByRole("status");
        expect(updateCapsula).toHaveBeenCalledWith(expect.objectContaining({
            id: "k1", descripcion: null, creado: null, duracion: null, modulo_id: "m2", profesor_id: null, order_index: 2,
        }));
        const fila = within(tabla()).getByText("Regate").closest("tr")!;
        expect(within(fila).getByText("Táctica")).toBeInTheDocument();
        expect(within(fila).getByText("Sin profesor")).toBeInTheDocument();
    });

    it("ADM-CAP-UI-002: una duración con formato inválido no se envía", async () => {
        const modal = await abrirEdicion();
        siguiente(modal);
        siguiente(modal);
        fireEvent.change(within(modal).getByLabelText(/Duración/), { target: { value: "diez minutos" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        expect(within(modal).getByRole("alert")).toHaveTextContent("formato");
        expect(updateCapsula).not.toHaveBeenCalled();
    });

    it("ADM-CAP-UI-003: cerrar durante la subida pide confirmación, aborta el XHR y borra el video de Bunny (CAP-02)", async () => {
        renderPagina();
        await within(tabla()).findByText("Regate");
        fireEvent.click(screen.getByRole("button", { name: /Nueva cápsula/ }));
        const modal = screen.getByRole("dialog", { name: "Nueva cápsula" });
        fireEvent.change(within(modal).getByLabelText(/Título/), { target: { value: "Pases" } });
        siguiente(modal);

        const video = new File(["x"], "pases.mp4", { type: "video/mp4" });
        fireEvent.change(modal.querySelector("#video-upload-input")!, { target: { files: [video] } });
        await waitFor(() => expect(FakeXHR.ultimo).not.toBeNull());

        fireEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));
        const aviso = within(modal).getByRole("alertdialog", { name: "Subida en curso" });
        expect(FakeXHR.ultimo!.abort).not.toHaveBeenCalled();
        fireEvent.click(within(aviso).getByRole("button", { name: "Cancelar subida y cerrar" }));

        expect(FakeXHR.ultimo!.abort).toHaveBeenCalled();
        expect(descartarVideoSubido).toHaveBeenCalledWith("vid-nuevo");
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ADM-CAP-UI-004: quitar el PDF actual no lo borra hasta guardar; al cancelar se conserva", async () => {
        vi.mocked(getDocumentosByCapsula).mockResolvedValue([{ id: "d1", nombre: "guia.pdf", url_archivo: "documento_a.pdf" }] as never);
        const modal = await abrirEdicion();
        siguiente(modal);

        const doc = await within(modal).findByText("guia.pdf");
        fireEvent.click(within(doc.closest("section")!).getByRole("button", { name: "Quitar" }));
        expect(within(modal).getByText(/se borrará al guardar/)).toBeInTheDocument();
        fireEvent.click(within(modal).getByRole("button", { name: "Cancelar" }));

        expect(deleteDocumento).not.toHaveBeenCalled();
    });

    it("ADM-CAP-UI-005: eliminar advierte que se borra el video y muestra lo que no se pudo limpiar (CAP-05)", async () => {
        vi.mocked(deleteCapsula).mockResolvedValue({ success: true, avisos: ["No se pudo borrar el video en Bunny: bórralo desde su panel."] });
        renderPagina();
        await within(tabla()).findByText("Regate");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar Regate" }));
        const dialogo = screen.getByRole("dialog", { name: "Eliminar cápsula" });
        expect(dialogo).toHaveTextContent("Se borra su video en Bunny");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("bórralo desde su panel");
        expect(within(tabla()).queryByText("Regate")).toBeNull();
    });
});
