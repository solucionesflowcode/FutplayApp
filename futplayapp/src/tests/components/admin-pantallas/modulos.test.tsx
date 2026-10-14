// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("@/data/modulos", () => ({
    getModulos: vi.fn(),
    getCategorias: vi.fn(),
    createModulo: vi.fn(),
    updateModulo: vi.fn(),
    deleteModulo: vi.fn(),
}));

import { getModulos, getCategorias, updateModulo, deleteModulo } from "@/data/modulos";
import { ToastProvider } from "@/components/admin/ui";
import ModulosPage from "@/app/(admin)/admin/modulos/page";

const MODULOS = [
    { id: "m1", nombre: "Técnica", descripcion: "Pase y control", categoria_id: "cat1", categoria_nombre: "Fundamentos", total_capsulas: 3 },
    { id: "m2", nombre: "Vacío", descripcion: "", categoria_id: null, categoria_nombre: "—", total_capsulas: 0 },
];
const CATEGORIAS = [{ id: "cat1", nombre: "Fundamentos" }, { id: "cat2", nombre: "Táctica" }];

const tabla = () => screen.getByRole("table", { name: "Módulos" });
const fila = (texto: string) => within(tabla()).getByText(texto).closest("tr")!;

function renderPagina() {
    return render(<ToastProvider><ModulosPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getModulos).mockResolvedValue(structuredClone(MODULOS));
    vi.mocked(getCategorias).mockResolvedValue(CATEGORIAS);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Gestión de módulos (fase 3)", () => {
    it("ADM-MOD-UI-001: al cambiar la categoría, la tabla muestra la nueva (MOD-01)", async () => {
        vi.mocked(updateModulo).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Técnica");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar Técnica" }));
        const modal = screen.getByRole("dialog", { name: "Editar módulo" });
        fireEvent.change(within(modal).getByLabelText(/Categoría/), { target: { value: "cat2" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        await screen.findByRole("status");
        expect(updateModulo).toHaveBeenCalledWith({ id: "m1", nombre: "Técnica", descripcion: "Pase y control", categoria_id: "cat2" });
        expect(within(fila("Técnica")).getByText("Táctica")).toBeInTheDocument();
    });

    it("ADM-MOD-UI-002: se puede dejar sin categoría (MOD-01)", async () => {
        vi.mocked(updateModulo).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Técnica");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar Técnica" }));
        const modal = screen.getByRole("dialog", { name: "Editar módulo" });
        fireEvent.change(within(modal).getByLabelText(/Categoría/), { target: { value: "" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        await screen.findByRole("status");
        expect(updateModulo).toHaveBeenCalledWith(expect.objectContaining({ categoria_id: null }));
        expect(within(fila("Técnica")).getByText("Sin categoría")).toBeInTheDocument();
    });

    it("ADM-MOD-UI-003: un módulo con cápsulas no abre la confirmación y explica por qué", async () => {
        renderPagina();
        await within(tabla()).findByText("Técnica");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar Técnica" }));

        expect(screen.queryByRole("dialog")).toBeNull();
        expect(await screen.findByRole("alert")).toHaveTextContent("3 cápsulas");
        expect(deleteModulo).not.toHaveBeenCalled();
    });

    it("ADM-MOD-UI-004: si falla eliminar, el módulo vuelve y se muestra el error", async () => {
        vi.mocked(deleteModulo).mockResolvedValue({ success: false, error: "Error de la BD" });
        renderPagina();
        await within(tabla()).findByText("Vacío");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar Vacío" }));
        fireEvent.click(within(screen.getByRole("dialog", { name: "Eliminar módulo" })).getByRole("button", { name: "Eliminar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Error de la BD");
        expect(within(tabla()).getByText("Vacío")).toBeInTheDocument();
    });
});
