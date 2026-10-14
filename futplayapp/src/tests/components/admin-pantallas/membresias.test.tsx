// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

vi.mock("@/data/membresia", () => ({
    getMembresiasGestion: vi.fn(),
    createMembresiaGestion: vi.fn(),
    updateMembresiaGestion: vi.fn(),
    deleteMembresiaGestion: vi.fn(),
    congelarMembresia: vi.fn(),
    reactivarMembresia: vi.fn(),
}));
vi.mock("@/data/plans", () => ({
    getUsers: vi.fn(),
    getPlanesAdmin: vi.fn(),
}));

import {
    getMembresiasGestion, deleteMembresiaGestion, updateMembresiaGestion, congelarMembresia,
} from "@/data/membresia";
import { getUsers, getPlanesAdmin } from "@/data/plans";
import { ToastProvider } from "@/components/admin/ui";
import MembresiasPage from "@/app/(admin)/admin/membresias/page";

const base = { plan_id: "p1", boleta_id: null, fecha_inicio: "2026-10-01T12:00:00Z", fecha_vencimiento: "2026-10-31T12:00:00Z", congelada: false, sin_tokens: false, fecha_congelamiento: null, created_at: null };
const MEMBRESIAS = [
    { ...base, id: "m1", usuario_id: "u1", usuario_nombre: "Ana Activa", plan_nombre: "Plan Basico", tokens_totales: 4, tokens_usados: 2, estado: true },
    { ...base, id: "m2", usuario_id: "u2", usuario_nombre: "Carlos Congelado", plan_nombre: "Plan Pro", tokens_totales: 12, tokens_usados: 3, estado: true, congelada: true },
];

function renderPagina() {
    return render(<ToastProvider><MembresiasPage /></ToastProvider>);
}

const tabla = () => screen.getByRole("table", { name: "Membresías" });

beforeEach(() => {
    vi.mocked(getMembresiasGestion).mockResolvedValue(MEMBRESIAS as never);
    vi.mocked(getUsers).mockResolvedValue([
        { id: "u1", name: "Ana Activa", role: "Alumno", plan: "", tokens: 0, status: "Activo" },
        { id: "p9", name: "Pepe Profesor", role: "Profesor", plan: "", tokens: 0, status: "Inactivo" },
    ]);
    vi.mocked(getPlanesAdmin).mockResolvedValue({ planes: [{ id: "p1", nombre: "Plan Basico", precio: 30000, tokens_mensuales: 4, dias: 30 }] } as never);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Gestión de membresías (fase 3)", () => {
    it("ADM-MEM-001: los tokens se leen como usados y disponibles (MEM-07)", async () => {
        renderPagina();

        expect(await within(tabla()).findByText("2 usados · 2 disponibles")).toBeInTheDocument();
        expect(within(tabla()).getByText("Congelada")).toBeInTheDocument();
    });

    it("ADM-MEM-002: los filtros por estado muestran su conteo y filtran", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(screen.getByRole("button", { name: /Congeladas 1/ }));

        expect(within(tabla()).queryByText("Ana Activa")).toBeNull();
        expect(within(tabla()).getByText("Carlos Congelado")).toBeInTheDocument();
    });

    it("ADM-MEM-003: si falla eliminar, la membresía vuelve a la lista y se avisa el motivo", async () => {
        vi.mocked(deleteMembresiaGestion).mockResolvedValue({ ok: false, error: "Error de la BD" });
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar membresía de Ana Activa" }));
        const dialogo = screen.getByRole("dialog", { name: "Eliminar membresía" });
        expect(dialogo).toHaveTextContent("No se devuelven tokens");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Error de la BD");
        expect(within(tabla()).getByText("Ana Activa")).toBeInTheDocument();
    });

    it("ADM-MEM-004: el selector de alumno no incluye profesores (MEM-05) y no hay campo de boleta (MEM-06)", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(screen.getByRole("button", { name: /Nueva membresía/ }));
        const select = screen.getByLabelText(/Alumno/);

        expect(within(select).queryByText("Pepe Profesor")).toBeNull();
        expect(within(select).getByText("Ana Activa")).toBeInTheDocument();
        expect(screen.queryByLabelText(/Boleta/)).toBeNull();
    });

    it("ADM-MEM-005: al pasar a Inactiva avisa que se borran reservas sin devolver tokens (MEM-04)", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar membresía de Ana Activa" }));
        fireEvent.change(screen.getByLabelText(/Estado/), { target: { value: "false" } });

        expect(screen.getByLabelText(/Estado/)).toHaveAccessibleDescription(/no se devuelven sus tokens/);
    });

    it("ADM-MEM-006: el error de la API se muestra dentro del formulario y el modal no se cierra", async () => {
        vi.mocked(updateMembresiaGestion).mockResolvedValue({ ok: false, error: "El alumno ya tiene una membresía vigente" });
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar membresía de Ana Activa" }));
        fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

        const dialogo = await screen.findByRole("dialog", { name: "Editar membresía" });
        expect(await within(dialogo).findByRole("alert")).toHaveTextContent("ya tiene una membresía vigente");
    });

    it("ADM-MEM-007: congelar informa cuántas reservas se cancelaron", async () => {
        vi.mocked(congelarMembresia).mockResolvedValue({ ok: true, reservasCanceladas: 2 });
        renderPagina();
        await within(tabla()).findByText("Ana Activa");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Congelar membresía de Ana Activa" }));
        const dialogo = screen.getByRole("dialog", { name: "Congelar membresía" });
        fireEvent.click(within(dialogo).getByRole("button", { name: "Congelar" }));

        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Se cancelaron 2 reservas"));
    });
});
