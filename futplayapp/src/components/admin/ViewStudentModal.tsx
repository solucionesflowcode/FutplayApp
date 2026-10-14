"use client";

import type { Student } from "./StudentsTable";
import { formatoTelefono } from "./StudentsTable";
import { Button, Modal, StatusBadge } from "@/components/admin/ui";

type Props = {
  student: Student | null;
  open: boolean;
  onClose: () => void;
};

export default function ViewStudentModal({ student, open, onClose }: Props) {
  if (!student) return null;

  const filas: [string, React.ReactNode][] = [
    ["Rol", student.role],
    ["Email", student.email || "—"],
    ["RUT", student.rut || "—"],
    ["Teléfono", formatoTelefono(student.phone)],
    ["Plan", student.plan],
    ["Tokens disponibles", student.tokens],
    ["Estado", <StatusBadge key="estado" estado={student.status} />],
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={student.name}
      description="Detalle del usuario"
      cerrarConFondo
      footer={<Button variante="secundario" onClick={onClose}>Cerrar</Button>}
    >
      <dl className="divide-y divide-gray-100">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex justify-between gap-4 py-2.5">
            <dt className="text-sm text-gray-500">{etiqueta}</dt>
            <dd className="text-sm font-medium text-gray-900 text-right">{valor}</dd>
          </div>
        ))}
        <div className="py-2.5">
          <dt className="text-xs text-gray-400">ID</dt>
          <dd className="text-xs text-gray-500 break-all font-mono">{student.id}</dd>
        </div>
      </dl>
    </Modal>
  );
}
