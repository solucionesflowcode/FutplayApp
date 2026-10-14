// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("@/data/profesores", () => ({
    getProfesores: vi.fn(),
    updateProfesor: vi.fn(),
    deleteProfesor: vi.fn(),
    quitarRolProfesor: vi.fn(),
    searchUsuarioPorEmail: vi.fn(),
    cambiarRolAProfesor: vi.fn(),
}));

import {
    getProfesores,
    updateProfesor,
    deleteProfesor,
    quitarRolProfesor,
    searchUsuarioPorEmail,
    cambiarRolAProfesor,
} from "@/data/profesores";
import { ToastProvider } from "@/components/admin/ui";
import ProfesoresPage from "@/app/(admin)/admin/profesores/page";

const PROFESORES = [
    {
        id: "pr1", nombre: "Ana Libre", email: "ana@test.cl", telefono: "+56912345678", foto_url: "https://cdn/ana.jpg",
        created_at: "2026-01-10T12:00:00Z", total_clases: 0, clases: [], total_capsulas: 0, capsulas: [],
    },
    {
        id: "pr2", nombre: "Beto Ocupado", email: "beto@test.cl", telefono: "", foto_url: "",
        created_at: "2026-02-10T12:00:00Z", total_clases: 1, clases: [{ id: "c1", titulo: "Técnica" }], total_capsulas: 0, capsulas: [],
    },
];

const tabla = () => screen.getByRole("table", { name: "Profesores" });

function renderPagina() {
    return render(<ToastProvider><ProfesoresPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getProfesores).mockResolvedValue(structuredClone(PROFESORES));
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Gestión de profesores (fase 3)", () => {
    it("ADM-PRO-UI-001: quitar el rol explica que conserva la cuenta y llama a quitarRolProfesor (PRO-01)", async () => {
        vi.mocked(quitarRolProfesor).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Quitar rol de profesor a Ana Libre" }));
        const dialogo = screen.getByRole("dialog", { name: "Quitar rol de profesor" });
        expect(dialogo).toHaveTextContent("conserva su cuenta");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Quitar rol" }));

        expect(await screen.findByRole("status")).toHaveTextContent("ya no es profesor");
        expect(quitarRolProfesor).toHaveBeenCalledWith("pr1");
        expect(deleteProfesor).not.toHaveBeenCalled();
        expect(within(tabla()).queryByText("Ana Libre")).toBeNull();
    });

    it("ADM-PRO-UI-002: eliminar la cuenta es una acción aparte que advierte lo que se borra", async () => {
        vi.mocked(deleteProfesor).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar cuenta de Ana Libre" }));
        const dialogo = screen.getByRole("dialog", { name: "Eliminar cuenta" });
        expect(dialogo).toHaveTextContent("membresías, boletas, reservas");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar cuenta" }));

        await screen.findByRole("status");
        expect(deleteProfesor).toHaveBeenCalledWith("pr1");
        expect(quitarRolProfesor).not.toHaveBeenCalled();
    });

    it("ADM-PRO-UI-003: con clases asignadas no se abre la confirmación y se explica por qué", async () => {
        renderPagina();
        await within(tabla()).findByText("Beto Ocupado");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Quitar rol de profesor a Beto Ocupado" }));

        expect(screen.queryByRole("dialog")).toBeNull();
        expect(await screen.findByRole("alert")).toHaveTextContent("1 clase");
        expect(quitarRolProfesor).not.toHaveBeenCalled();
    });

    it("ADM-PRO-UI-004: si la API rechaza la acción, el profesor vuelve a la tabla", async () => {
        vi.mocked(deleteProfesor).mockResolvedValue({ success: false, error: "tiene 2 clase(s)" });
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar cuenta de Ana Libre" }));
        fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar cuenta" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("tiene 2 clase(s)");
        expect(within(tabla()).getByText("Ana Libre")).toBeInTheDocument();
    });

    it("ADM-PRO-UI-005: convertir a profesor pide confirmación (PRO-03)", async () => {
        vi.mocked(searchUsuarioPorEmail).mockResolvedValue([{ id: "j1", nombre: "Juan Jugador", email: "juan@test.cl", rol: "jugador" }]);
        vi.mocked(cambiarRolAProfesor).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(screen.getByRole("button", { name: /Agregar profesor/ }));
        const modal = screen.getByRole("dialog", { name: "Agregar profesor" });
        fireEvent.change(within(modal).getByLabelText("Email"), { target: { value: "juan" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Buscar" }));
        fireEvent.click(await within(modal).findByRole("button", { name: "Hacer profesor a Juan Jugador" }));

        expect(cambiarRolAProfesor).not.toHaveBeenCalled();
        const confirmar = screen.getByRole("dialog", { name: "Hacer profesor" });
        fireEvent.click(within(confirmar).getByRole("button", { name: "Hacer profesor" }));

        expect(await screen.findByRole("status")).toHaveTextContent("Juan Jugador ahora es profesor");
        expect(cambiarRolAProfesor).toHaveBeenCalledWith("j1");
    });

    it("ADM-PRO-UI-006: teléfono con prefijo +569 y se pueden borrar teléfono y foto (PRO-02)", async () => {
        vi.mocked(updateProfesor).mockResolvedValue({ success: true });
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar Ana Libre" }));
        const modal = screen.getByRole("dialog", { name: "Editar profesor" });
        const telefono = within(modal).getByLabelText(/Teléfono/);
        expect(telefono).toHaveValue("12345678");
        fireEvent.change(telefono, { target: { value: "" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Quitar foto" }));
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        await screen.findByRole("status");
        expect(updateProfesor).toHaveBeenCalledWith({ id: "pr1", nombre: "Ana Libre", email: "ana@test.cl", telefono: null, foto_url: null });
    });

    it("ADM-PRO-UI-007: un teléfono incompleto no se envía", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Libre");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar Ana Libre" }));
        const modal = screen.getByRole("dialog", { name: "Editar profesor" });
        fireEvent.change(within(modal).getByLabelText(/Teléfono/), { target: { value: "123" } });
        fireEvent.click(within(modal).getByRole("button", { name: "Guardar cambios" }));

        expect(within(modal).getByRole("alert")).toBeInTheDocument();
        expect(updateProfesor).not.toHaveBeenCalled();
    });
});
