"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2, Heart, Loader2 } from "lucide-react";
import { getFichaMedicaByUser, calcularEdad, type FichaMedicaData } from "@/data/fichaMedica";
import { DataTable, Modal, Button, StatusBadge, digitosMovil, type Columna } from "@/components/admin/ui";

export type Student = {
  id: string;
  name: string;
  role: string;
  rut?: string;
  phone?: string;
  email?: string;
  plan: string;
  tokens: number;
  status: string;
  medicalFileUrl?: string;
};

type FichaModalState = {
  alumno: Student | null;
  loading: boolean;
  error: string | null;
  data: (FichaMedicaData & { usuario_id: string }) | null;
};

type Props = {
  students: Student[];
  // Cambia cuando cambia el filtro (p. ej. el texto buscado): vuelve a la página 1.
  resetKey?: string;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onView?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
};

const COLOR_ROL: Record<string, string> = {
  Alumno: "bg-blue-100 text-blue-700",
  Profesor: "bg-purple-100 text-purple-700",
  Admin: "bg-gray-200 text-gray-700",
};

/** +56979046977 → "+569 7904 6977" (antes se mostraba tal como estaba guardado). */
export function formatoTelefono(telefono?: string): string {
  const d = digitosMovil(telefono ?? "");
  return d.length === 8 ? `+569 ${d.slice(0, 4)} ${d.slice(4)}` : telefono || "—";
}

export default function StudentsTable({ students, resetKey, cargando = false, error, onReintentar, onView, onEdit, onDelete }: Props) {
  const [ficha, setFicha] = useState<FichaModalState>({ alumno: null, loading: false, error: null, data: null });

  const openFicha = async (alumno: Student) => {
    setFicha({ alumno, loading: true, error: null, data: null });
    const data = await getFichaMedicaByUser(alumno.id);
    setFicha({ alumno, loading: false, error: data ? null : "No tiene ficha médica registrada.", data });
  };
  const closeFicha = () => setFicha({ alumno: null, loading: false, error: null, data: null });

  const acciones = (s: Student) => (
    <div className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
      {/* Solo los alumnos tienen ficha médica (USR-09). */}
      {s.role === "Alumno" && (
        <button type="button" onClick={() => openFicha(s)} className="flex items-center gap-1 text-purple-600 text-xs border border-purple-200 px-2 py-1 rounded hover:bg-purple-50" aria-label={`Ficha médica de ${s.name}`}>
          <Heart size={14} aria-hidden /> Ficha
        </button>
      )}
      <button type="button" onClick={() => onView?.(s)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Ver detalle" aria-label={`Ver detalle de ${s.name}`}>
        <Eye size={16} />
      </button>
      <button type="button" onClick={() => onEdit?.(s)} className="p-1.5 text-marca hover:bg-blue-50 rounded-lg" title="Editar" aria-label={`Editar a ${s.name}`}>
        <Pencil size={16} />
      </button>
      <button type="button" onClick={() => onDelete?.(s)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar" aria-label={`Eliminar a ${s.name}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );

  const columnas: Columna<Student>[] = [
    {
      id: "nombre",
      encabezado: "Nombre",
      // Sin el UUID debajo del nombre (USR-06): queda en "Ver detalle".
      celda: (s) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate max-w-[220px]">{s.name}</p>
          {s.email && <p className="text-xs text-gray-500 truncate max-w-[220px]">{s.email}</p>}
        </div>
      ),
      valorOrden: (s) => s.name,
    },
    // Antes la columna se llamaba "Usuario" y mostraba el rol (USR-06).
    { id: "rol", encabezado: "Rol", celda: (s) => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${COLOR_ROL[s.role] ?? COLOR_ROL.Admin}`}>{s.role}</span>, valorOrden: (s) => s.role },
    { id: "rut", encabezado: "RUT", celda: (s) => s.rut || "—", className: "whitespace-nowrap" },
    { id: "telefono", encabezado: "Teléfono", celda: (s) => formatoTelefono(s.phone), className: "whitespace-nowrap" },
    { id: "plan", encabezado: "Plan", celda: (s) => s.plan, valorOrden: (s) => s.plan },
    { id: "tokens", encabezado: "Tokens", celda: (s) => s.tokens, valorOrden: (s) => s.tokens },
    { id: "estado", encabezado: "Estado", celda: (s) => <StatusBadge estado={s.status} />, valorOrden: (s) => s.status },
    { id: "acciones", encabezado: "Acciones", celda: acciones },
  ];

  const d = ficha.data;
  return (
    <>
      <DataTable
        etiqueta="Usuarios"
        filas={students}
        columnas={columnas}
        getId={(s) => s.id}
        resetKey={resetKey}
        cargando={cargando}
        error={error}
        onReintentar={onReintentar}
        vacio="No se encontraron usuarios"
        tarjetaMovil={(s) => (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-500">{s.role} · {s.plan} · {s.tokens} tokens</p>
              </div>
              <StatusBadge estado={s.status} />
            </div>
            <p className="text-xs text-gray-500">{formatoTelefono(s.phone)}{s.rut ? ` · ${s.rut}` : ""}</p>
            {acciones(s)}
          </div>
        )}
      />

      <Modal
        open={ficha.alumno !== null}
        onClose={closeFicha}
        title="Ficha médica"
        description={ficha.alumno?.name}
        cerrarConFondo
        footer={<Button variante="secundario" onClick={closeFicha}>Cerrar</Button>}
      >
        {ficha.loading && (
          <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando ficha">
            <Loader2 className="w-8 h-8 animate-spin text-acento" aria-hidden />
          </div>
        )}
        {ficha.error && <p className="p-4 bg-gray-50 rounded text-center text-gray-500">{ficha.error}</p>}
        {d && (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-3">
              {[
                ["Edad", `${calcularEdad(d.fecha_nacimiento)} años`],
                ["Peso", `${d.peso_kg} kg`],
                ["Estatura", `${d.estatura_cm} cm`],
                ["IMC", String(d.imc)],
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="p-3 bg-gray-50 rounded">
                  <dt className="text-xs text-gray-500">{etiqueta}</dt>
                  <dd className="font-semibold text-gray-900">{valor}</dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-3">
              {[
                ["Enfermedades", d.enfermedades || "Ninguna"],
                ["Alergias", d.alergias || "Ninguna"],
                ["Medicamentos", d.medicamentos || "Ninguno"],
                ...(d.observaciones ? [["Observaciones", d.observaciones]] : []),
              ].map(([etiqueta, valor]) => (
                <div key={etiqueta} className="p-3 bg-gray-50 rounded">
                  <dt className="text-xs text-gray-500">{etiqueta}</dt>
                  <dd className="font-medium text-gray-900">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
