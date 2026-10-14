// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

const nav = vi.hoisted(() => ({ pathname: "/admin/clases", push: vi.fn() }));
vi.mock("next/navigation", () => ({
    usePathname: () => nav.pathname,
    useRouter: () => ({ push: nav.push }),
}));
vi.mock("@/context", () => ({
    useAuthUser: () => ({
        user: { email: "admin@futplay.cl", user_metadata: {} },
        usuario: { nombre: "Ana Admin" },
        signOut: vi.fn(),
        refreshUser: vi.fn(),
    }),
}));
vi.mock("@/data/profesores", () => ({
    getProfesores: vi.fn(),
    updateProfesor: vi.fn(),
    deleteProfesor: vi.fn(),
    quitarRolProfesor: vi.fn(),
    searchUsuarioPorEmail: vi.fn(),
    cambiarRolAProfesor: vi.fn(),
}));

import { getProfesores } from "@/data/profesores";
import { DataTable, ToastProvider } from "@/components/admin/ui";
import Sidebar from "@/components/admin/Sidebar";
import ProfileDropdown from "@/components/admin/ProfileDropdown";
import ProfesoresPage from "@/app/(admin)/admin/profesores/page";

beforeEach(() => {
    try { localStorage.clear(); } catch { /* jsdom sin storage */ }
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("Estados de carga y error (GEN-08)", () => {
    const columnas = [{ id: "n", encabezado: "Nombre", celda: (f: { id: string }) => f.id }];

    it("ADM-GEN-001: con error muestra el motivo y Reintentar, no 'No hay registros'", () => {
        const reintentar = vi.fn();
        render(<DataTable etiqueta="T" filas={[]} columnas={columnas} getId={(f) => f.id} error="No se pudieron cargar los usuarios" onReintentar={reintentar} tarjetaMovil={(f) => f.id} />);

        const tabla = screen.getByRole("table", { name: "T" });
        expect(within(tabla).getByRole("alert")).toHaveTextContent("No se pudieron cargar los usuarios");
        expect(screen.queryByText("No hay registros")).toBeNull();
        fireEvent.click(within(tabla).getByRole("button", { name: /Reintentar/ }));
        expect(reintentar).toHaveBeenCalledTimes(1);
    });

    it("ADM-GEN-002: si falla la carga de una pantalla, se ve el error y Reintentar vuelve a pedir los datos", async () => {
        vi.mocked(getProfesores)
            .mockRejectedValueOnce(new Error("No se pudieron cargar los profesores"))
            .mockResolvedValueOnce([]);
        render(<ToastProvider><ProfesoresPage /></ToastProvider>);

        const tabla = screen.getByRole("table", { name: "Profesores" });
        expect(await within(tabla).findByRole("alert")).toHaveTextContent("No se pudieron cargar los profesores");
        fireEvent.click(within(tabla).getByRole("button", { name: /Reintentar/ }));

        expect(await within(tabla).findByText("No hay profesores registrados aún")).toBeInTheDocument();
        expect(getProfesores).toHaveBeenCalledTimes(2);
    });
});

describe("Menú lateral (GEN-05)", () => {
    it("ADM-GEN-003: marca la sección actual con aria-current y los botones tienen nombre", () => {
        render(<Sidebar />);

        expect(screen.getByRole("link", { name: "Gestión de clases" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Analíticas" })).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("button", { name: "Colapsar menú" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("button", { name: "Cerrar menú" })).toBeInTheDocument();
    });

    it("ADM-GEN-004: colapsado, cada ícono tiene tooltip y el estado se recuerda", () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByRole("button", { name: "Colapsar menú" }));

        expect(screen.getByRole("link", { name: "Gestión de planes" })).toHaveAttribute("title", "Gestión de planes");
        expect(localStorage.getItem("admin-menu-colapsado")).toBe("1");

        cleanup();
        render(<Sidebar />);
        expect(screen.getByRole("button", { name: "Expandir menú" })).toHaveAttribute("aria-expanded", "false");
    });

    it("ADM-GEN-005: en móvil, Escape cierra el menú", () => {
        const cerrar = vi.fn();
        render(<Sidebar mobileOpen setMobileOpen={cerrar} />);

        fireEvent.keyDown(document, { key: "Escape" });
        expect(cerrar).toHaveBeenCalledWith(false);
    });
});

describe("Un solo flujo de perfil (GEN-06)", () => {
    it("ADM-GEN-006: el menú del avatar lleva a /admin/perfil y no abre un modal propio", () => {
        render(<ProfileDropdown />);
        const boton = screen.getByRole("button", { name: "Cuenta de Ana Admin" });
        expect(boton).toHaveAttribute("aria-expanded", "false");
        fireEvent.click(boton);

        const menu = screen.getByRole("menu");
        expect(within(menu).getByRole("menuitem", { name: /Mi perfil/ })).toHaveAttribute("href", "/admin/perfil");
        fireEvent.click(within(menu).getByRole("menuitem", { name: /Mi perfil/ }));
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("ADM-GEN-007: Escape cierra el menú del avatar", () => {
        render(<ProfileDropdown />);
        fireEvent.click(screen.getByRole("button", { name: "Cuenta de Ana Admin" }));

        fireEvent.keyDown(document, { key: "Escape" });
        expect(screen.queryByRole("menu")).toBeNull();
    });
});
