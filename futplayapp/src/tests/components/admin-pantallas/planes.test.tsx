// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("@/data/plans", () => ({
    getPlanesAdmin: vi.fn(),
    createPlanAdmin: vi.fn(),
    updatePlanAdmin: vi.fn(),
    setPlanActivo: vi.fn(),
    PLANES_CON_LINK: ["familiar", "liga"],
}));

import { getPlanesAdmin, createPlanAdmin, setPlanActivo } from "@/data/plans";
import { ToastProvider } from "@/components/admin/ui";
import PlanesPage from "@/app/(admin)/admin/planes/page";

const PLANES = [
    { id: "p1", nombre: "Plan Basico", precio: 30000, tokens_mensuales: 4, dias: 30, tipo_plan: "normal", activo: true },
    { id: "p2", nombre: "Plan Familiar 1", precio: 75000, tokens_mensuales: 12, dias: 30, tipo_plan: "familiar", activo: true, codigo_acceso: "tok-123" },
    { id: "p3", nombre: "Plan Viejo", precio: 20000, tokens_mensuales: 2, dias: 30, tipo_plan: "normal", activo: false },
];

const tabla = () => screen.getByRole("table", { name: "Planes" });

function renderPagina() {
    return render(<ToastProvider><PlanesPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getPlanesAdmin).mockResolvedValue({ planes: PLANES } as never);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Gestión de planes (fase 3, planes desactivables)", () => {
    it("ADM-PLA-UI-001: por defecto muestra los planes en venta; los desactivados en su filtro", async () => {
        renderPagina();
        await within(tabla()).findByText("Plan Basico");

        expect(within(tabla()).queryByText("Plan Viejo")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /Desactivados 1/ }));
        expect(within(tabla()).getByText("Plan Viejo")).toBeInTheDocument();
    });

    it("ADM-PLA-UI-002: no hay botón de eliminar; desactivar explica las consecuencias y llama a setPlanActivo", async () => {
        vi.mocked(setPlanActivo).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Plan Familiar 1");

        expect(within(tabla()).queryByRole("button", { name: /Eliminar/ })).toBeNull();
        fireEvent.click(within(tabla()).getByRole("button", { name: "Desactivar Plan Familiar 1" }));
        const dialogo = screen.getByRole("dialog", { name: "Desactivar plan" });
        expect(dialogo).toHaveTextContent("no se puede comprar");
        expect(dialogo).toHaveTextContent("Su link de acceso deja de funcionar");
        expect(dialogo).toHaveTextContent("Las membresías vigentes de este plan no cambian");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Desactivar" }));

        expect(await screen.findByRole("status")).toHaveTextContent("ya no se vende");
        expect(setPlanActivo).toHaveBeenCalledWith("p2", false);
    });

    it("ADM-PLA-UI-003: si falla desactivar, el plan vuelve a su estado", async () => {
        vi.mocked(setPlanActivo).mockResolvedValue({ success: false, error: "Error de la BD" });
        renderPagina();
        await within(tabla()).findByText("Plan Basico");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Desactivar Plan Basico" }));
        fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Desactivar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Error de la BD");
        expect(within(tabla()).getByText("Plan Basico")).toBeInTheDocument();
    });

    it("ADM-PLA-UI-004: el link se muestra en un modal con botón Copiar (sin window.prompt) (PLA-05)", async () => {
        const prompt = vi.spyOn(window, "prompt").mockImplementation(() => null);
        renderPagina();
        await within(tabla()).findByText("Plan Familiar 1");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Link de acceso de Plan Familiar 1" }));
        const dialogo = screen.getByRole("dialog", { name: "Link de acceso" });

        expect(within(dialogo).getByLabelText("Link")).toHaveValue(`${window.location.origin}/planes/familiar/tok-123`);
        expect(within(dialogo).getByRole("button", { name: "Copiar link" })).toBeInTheDocument();
        expect(prompt).not.toHaveBeenCalled();
    });

    it("ADM-PLA-UI-005: los números se pueden vaciar y el plan Liga se guarda sin tokens (PLA-03/04)", async () => {
        vi.mocked(createPlanAdmin).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Plan Basico");

        fireEvent.click(screen.getByRole("button", { name: /Nuevo plan/ }));
        const dialogo = screen.getByRole("dialog", { name: "Nuevo plan" });
        const dias = within(dialogo).getByLabelText(/Duración/);
        fireEvent.change(dias, { target: { value: "" } });
        expect(dias).toHaveValue("");

        fireEvent.change(within(dialogo).getByLabelText(/Nombre/), { target: { value: "Liga 2026" } });
        fireEvent.change(within(dialogo).getByLabelText(/Tipo de plan/), { target: { value: "liga" } });
        fireEvent.change(within(dialogo).getByLabelText(/Precio/), { target: { value: "40000" } });
        fireEvent.change(dias, { target: { value: "90" } });
        expect(within(dialogo).getByLabelText(/Tokens/)).toBeDisabled();
        fireEvent.click(within(dialogo).getByRole("button", { name: "Crear plan" }));

        await screen.findByRole("status");
        expect(createPlanAdmin).toHaveBeenCalledWith({ nombre: "Liga 2026", precio: 40000, tokens_mensuales: 0, dias: 90, tipo_plan: "liga" });
    });
});
