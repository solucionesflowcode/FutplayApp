// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

vi.mock("@/data/plans", () => ({ getUsers: vi.fn() }));
vi.mock("@/data/fichaMedica", () => ({ getFichaMedicaByUser: vi.fn(), calcularEdad: () => 30 }));

import { getUsers } from "@/data/plans";
import { ToastProvider } from "@/components/admin/ui";
import AdminPage from "@/app/(admin)/admin/page";
import { formatoTelefono } from "@/components/admin/StudentsTable";

const USUARIOS = [
    { id: "u1", name: "Ana Alumna", role: "Alumno", email: "ana@mail.cl", rut: "11.111.111-1", phone: "+56979046977", plan: "Plan Basico", tokens: 2, status: "Activo" },
    { id: "u2", name: "Carla Congelada", role: "Alumno", email: "carla@mail.cl", rut: "", phone: "", plan: "Plan Pro", tokens: 0, status: "Congelado" },
    { id: "p1", name: "Pedro Profe", role: "Profesor", email: "pedro@mail.cl", rut: "", phone: "", plan: "Sin plan", tokens: 0, status: "Inactivo" },
];

const tabla = () => screen.getByRole("table", { name: "Usuarios" });

function renderPagina() {
    return render(<ToastProvider><AdminPage /></ToastProvider>);
}

beforeEach(() => {
    vi.mocked(getUsers).mockResolvedValue(USUARIOS as never);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("Gestión de usuarios (fase 3)", () => {
    it("ADM-USR-001: la columna se llama Rol, sin UUID bajo el nombre y con el teléfono formateado (USR-06)", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");

        expect(within(tabla()).getByRole("columnheader", { name: /Rol/ })).toBeInTheDocument();
        expect(within(tabla()).queryByText("u1")).toBeNull();
        expect(within(tabla()).getByText("+569 7904 6977")).toBeInTheDocument();
        expect(formatoTelefono("56979046977")).toBe("+569 7904 6977");
    });

    it("ADM-USR-002: la tarjeta Congelados filtra la tabla y cuenta solo alumnos (USR-08)", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");

        fireEvent.click(screen.getByRole("button", { name: /Congelados/ }));

        expect(within(tabla()).queryByText("Ana Alumna")).toBeNull();
        expect(within(tabla()).getByText("Carla Congelada")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Congelados/ })).toHaveAttribute("aria-pressed", "true");
        // Un profesor "sin plan" no cuenta en "Sin plan".
        expect(screen.getByRole("button", { name: /Sin plan/ })).toHaveTextContent("0");
    });

    it("ADM-USR-003: se busca por email y por teléfono escrito con espacios", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");
        const buscar = screen.getByLabelText("Buscar usuarios");

        fireEvent.change(buscar, { target: { value: "7904 6977" } });
        expect(within(tabla()).getByText("Ana Alumna")).toBeInTheDocument();
        expect(within(tabla()).queryByText("Carla Congelada")).toBeNull();

        fireEvent.change(buscar, { target: { value: "pedro@" } });
        expect(within(tabla()).getByText("Pedro Profe")).toBeInTheDocument();
    });

    it("ADM-USR-004: la ficha médica solo aparece para alumnos (USR-09) y las acciones tienen nombre (USR-10)", async () => {
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");

        expect(within(tabla()).getByRole("button", { name: "Ficha médica de Ana Alumna" })).toBeInTheDocument();
        expect(within(tabla()).queryByRole("button", { name: "Ficha médica de Pedro Profe" })).toBeNull();
        expect(within(tabla()).getByRole("button", { name: "Editar a Pedro Profe" })).toBeInTheDocument();
    });

    it("ADM-USR-005: si falla eliminar, el usuario vuelve a su lugar y se avisa el motivo (sin alert)", async () => {
        const alerta = vi.spyOn(window, "alert").mockImplementation(() => {});
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ error: "No se puede eliminar: el alumno tiene 2 pago(s) registrado(s)." }), { status: 409 })
        );
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Eliminar a Ana Alumna" }));
        const dialogo = screen.getByRole("dialog", { name: "Eliminar usuario" });
        expect(dialogo).toHaveTextContent("ya no podrá iniciar sesión");
        fireEvent.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("2 pago(s)");
        const nombres = within(tabla()).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
        expect(nombres[0]).toContain("Ana Alumna"); // en su posición, no al final
        expect(alerta).not.toHaveBeenCalled();
    });

    it("ADM-USR-006: editar permite el email, valida el teléfono y lo envía como +569XXXXXXXX (USR-04/11)", async () => {
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
        renderPagina();
        await within(tabla()).findByText("Ana Alumna");

        fireEvent.click(within(tabla()).getByRole("button", { name: "Editar a Carla Congelada" }));
        const dialogo = screen.getByRole("dialog", { name: "Editar alumno" });
        fireEvent.change(within(dialogo).getByLabelText(/Teléfono/), { target: { value: "123" } });
        fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));
        expect(within(dialogo).getByLabelText(/Teléfono/)).toHaveAccessibleDescription(/8 dígitos/);
        expect(fetchMock).not.toHaveBeenCalled();

        fireEvent.change(within(dialogo).getByLabelText(/Teléfono/), { target: { value: "9123 4567" } });
        fireEvent.change(within(dialogo).getByLabelText(/Email/), { target: { value: "carla.nueva@mail.cl" } });
        fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

        await screen.findByRole("status");
        const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
        expect(body).toMatchObject({ id: "u2", email: "carla.nueva@mail.cl", telefono: "+56991234567", rut: null });
    });
});
