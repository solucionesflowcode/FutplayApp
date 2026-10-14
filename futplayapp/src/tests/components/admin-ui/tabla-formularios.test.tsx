// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import {
    DataTable, ordenarFilas, type Columna,
    FormField, CLASE_INPUT, NumberInput, parsearEntero, PhoneInput, digitosMovil,
    StatusBadge, infoEstado, StatCard, PageHeader,
} from "@/components/admin/ui";

afterEach(() => cleanup());

type Fila = { id: string; nombre: string; tokens: number | null };
const filas: Fila[] = Array.from({ length: 45 }, (_, i) => ({ id: `u${i + 1}`, nombre: `Alumno ${String(i + 1).padStart(2, "0")}`, tokens: i % 5 }));
const columnas: Columna<Fila>[] = [
    { id: "nombre", encabezado: "Nombre", celda: (f) => f.nombre, valorOrden: (f) => f.nombre },
    { id: "tokens", encabezado: "Tokens", celda: (f) => f.tokens ?? "—", valorOrden: (f) => f.tokens },
];

function filasDeLaTabla() {
    const tabla = screen.getByRole("table");
    return within(tabla).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);
}

describe("DataTable (USR-01/02/05)", () => {
    it("ADM-UI-TAB-001: pagina de a 20 y permite saltar a cualquier página", () => {
        render(<DataTable filas={filas} columnas={columnas} getId={(f) => f.id} />);

        expect(filasDeLaTabla()).toHaveLength(20);
        expect(screen.getByText("Mostrando 1 a 20 de 45")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "3" }));
        expect(filasDeLaTabla()).toEqual(["Alumno 41", "Alumno 42", "Alumno 43", "Alumno 44", "Alumno 45"]);
        expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
    });

    it("ADM-UI-TAB-002: al cambiar el filtro (resetKey) vuelve a la página 1", () => {
        function ConBusqueda() {
            const [q, setQ] = useState("");
            const visibles = filas.filter((f) => f.nombre.includes(q));
            return (
                <>
                    <input aria-label="buscar" value={q} onChange={(e) => setQ(e.target.value)} />
                    <DataTable filas={visibles} columnas={columnas} getId={(f) => f.id} resetKey={q} />
                </>
            );
        }
        render(<ConBusqueda />);
        fireEvent.click(screen.getByRole("button", { name: "3" }));

        fireEvent.change(screen.getByLabelText("buscar"), { target: { value: "Alumno 0" } });

        expect(filasDeLaTabla()[0]).toBe("Alumno 01");
        expect(screen.getByText("Mostrando 1 a 9 de 9")).toBeInTheDocument();
    });

    it("ADM-UI-TAB-003: sin resultados muestra el mensaje vacío, no 'Mostrando 1 a 0'", () => {
        render(<DataTable filas={[]} columnas={columnas} getId={(f: Fila) => f.id} vacio="No se encontraron usuarios" />);

        expect(screen.getByText("No se encontraron usuarios")).toBeInTheDocument();
        expect(screen.getByText("Sin registros")).toBeInTheDocument();
        expect(screen.queryByRole("navigation")).toBeNull();
    });

    it("ADM-UI-TAB-004: ordena por columna y lo indica con aria-sort", () => {
        render(<DataTable filas={filas.slice(0, 3)} columnas={columnas} getId={(f) => f.id} />);
        const boton = screen.getByRole("button", { name: /Nombre/ });

        fireEvent.click(boton);
        fireEvent.click(boton);

        expect(screen.getByRole("columnheader", { name: /Nombre/ })).toHaveAttribute("aria-sort", "descending");
        expect(filasDeLaTabla()).toEqual(["Alumno 03", "Alumno 02", "Alumno 01"]);
    });

    it("ADM-UI-TAB-005: los vacíos van al final y los números se ordenan como números", () => {
        const datos = [{ v: 10 }, { v: null }, { v: 2 }, { v: 33 }];
        expect(ordenarFilas(datos, (d) => d.v, true).map((d) => d.v)).toEqual([2, 10, 33, null]);
        expect(ordenarFilas(datos, (d) => d.v, false).map((d) => d.v)).toEqual([33, 10, 2, null]);
    });

    it("ADM-UI-TAB-006: mientras carga marca aria-busy y no muestra 'sin resultados'", () => {
        const { container } = render(<DataTable filas={[]} columnas={columnas} getId={(f: Fila) => f.id} cargando vacio="Vacío" />);

        expect(container.firstChild).toHaveAttribute("aria-busy", "true");
        expect(screen.queryByText("Vacío")).toBeNull();
    });
});

describe("FormField, NumberInput y PhoneInput (USR-11, PLA-04, USR-04)", () => {
    it("ADM-UI-FORM-001: el label queda asociado al control, con su ayuda y su error", () => {
        render(
            <FormField label="Precio" required ayuda="En pesos" error="El precio es obligatorio">
                {(p) => <input {...p} className={CLASE_INPUT} />}
            </FormField>
        );
        const input = screen.getByLabelText(/Precio/);

        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("En pesos El precio es obligatorio");
    });

    it("ADM-UI-FORM-002: un número se puede vaciar (antes volvía a 1) y se escribe otro desde cero", () => {
        const onChange = vi.fn();
        function Envoltura() {
            const [v, setV] = useState<number | null>(1);
            return <NumberInput aria-label="tokens" value={v} onChange={(n) => { setV(n); onChange(n); }} />;
        }
        render(<Envoltura />);
        const input = screen.getByLabelText("tokens");

        fireEvent.change(input, { target: { value: "" } });
        expect(input).toHaveValue("");
        expect(onChange).toHaveBeenLastCalledWith(null);

        fireEvent.change(input, { target: { value: "12" } });
        expect(onChange).toHaveBeenLastCalledWith(12);
    });

    it("ADM-UI-FORM-003: si el valor cambia desde afuera (p. ej. al elegir un plan), el campo se actualiza", () => {
        const { rerender } = render(<NumberInput aria-label="tokens" value={4} onChange={vi.fn()} />);
        rerender(<NumberInput aria-label="tokens" value={8} onChange={vi.fn()} />);
        expect(screen.getByLabelText("tokens")).toHaveValue("8");
    });

    it("ADM-UI-FORM-004: parsearEntero", () => {
        expect(parsearEntero(" 42 ")).toBe(42);
        expect(parsearEntero("")).toBeNull();
        expect(parsearEntero("4a")).toBeNull();
    });

    it("ADM-UI-FORM-005: el teléfono se escribe con 8 dígitos y se entrega como +569XXXXXXXX", () => {
        const onChange = vi.fn();
        function Envoltura() {
            const [tel, setTel] = useState("");
            return <PhoneInput aria-label="tel" value={tel} onChange={(t) => { setTel(t); onChange(t); }} />;
        }
        render(<Envoltura />);

        fireEvent.change(screen.getByLabelText("tel"), { target: { value: "7904 6977" } });
        expect(onChange).toHaveBeenLastCalledWith("+56979046977");
        expect(screen.getByLabelText("tel")).toHaveValue("79046977");

        fireEvent.change(screen.getByLabelText("tel"), { target: { value: "" } });
        expect(onChange).toHaveBeenLastCalledWith("");
    });

    it("ADM-UI-FORM-006: un teléfono guardado sin '+' (569…) se muestra con sus 8 dígitos", () => {
        expect(digitosMovil("56979046977")).toBe("79046977");
        expect(digitosMovil("+56991234567")).toBe("91234567");
        expect(digitosMovil("")).toBe("");
        render(<PhoneInput aria-label="tel" value="56979046977" onChange={vi.fn()} />);
        expect(screen.getByLabelText("tel")).toHaveValue("79046977");
    });
});

describe("StatusBadge, StatCard y PageHeader", () => {
    it("ADM-UI-EST-001: un solo mapa de estados para todo el admin", () => {
        expect(infoEstado("congelada").etiqueta).toBe("Congelada");
        expect(infoEstado("pendiente").etiqueta).toBe("Recordatorio enviado");
        expect(infoEstado("Inactivo").etiqueta).toBe("Sin plan");
        expect(infoEstado("desconocido").etiqueta).toBe("desconocido");
        render(<StatusBadge estado="sin_tokens" />);
        expect(screen.getByText("Sin tokens")).toBeInTheDocument();
    });

    it("ADM-UI-EST-002: una StatCard con onClick es un filtro (aria-pressed)", () => {
        const onClick = vi.fn();
        render(<StatCard etiqueta="Congelados" valor={3} onClick={onClick} activa />);
        const boton = screen.getByRole("button", { name: /Congelados/ });

        expect(boton).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(boton);
        expect(onClick).toHaveBeenCalled();
    });

    it("ADM-UI-EST-003: PageHeader tiene un único h1 con el título", () => {
        render(<PageHeader titulo="Gestión de membresías" descripcion="Planes de los alumnos" acciones={<button>Nueva</button>} />);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gestión de membresías");
    });
});
