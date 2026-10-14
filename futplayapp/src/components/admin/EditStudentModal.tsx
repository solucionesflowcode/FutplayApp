"use client";

import { useState } from "react";
import type { Student } from "./StudentsTable";
import { telefonoParaGuardar } from "@/lib/telefono";
import { Button, CLASE_INPUT, FormField, Modal, PhoneInput, useToast } from "@/components/admin/ui";

type Props = {
  student: Student | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const TITULO_POR_ROL: Record<string, string> = {
  Alumno: "Editar alumno",
  Profesor: "Editar profesor",
  Admin: "Editar administrador",
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Edición de un usuario (USR-11): labels visibles, email editable (la API lo
 * sincroniza con el login) y teléfono con prefijo +569 fijo (USR-04).
 */
export default function EditStudentModal({ student, open, onClose, onSaved }: Props) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rut, setRut] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; email?: string; telefono?: string; general?: string }>({});

  // Carga los datos al abrir otro alumno (ajuste en el render, sin useEffect).
  const [cargadoId, setCargadoId] = useState<string | null>(null);
  // Al cerrar se olvida: reabrir al mismo alumno tras cancelar no muestra lo que se descartó.
  if (!student && cargadoId !== null) setCargadoId(null);
  if (student && student.id !== cargadoId) {
    setCargadoId(student.id);
    setName(student.name);
    setEmail(student.email || "");
    setRut(student.rut || "");
    setPhone(student.phone || "");
    setErrores({});
    setSaving(false);
  }

  if (!student) return null;

  const handleSave = async () => {
    const telefono = telefonoParaGuardar(phone);
    const nuevos: typeof errores = {};
    if (!name.trim()) nuevos.nombre = "El nombre es obligatorio";
    if (!EMAIL_VALIDO.test(email.trim())) nuevos.email = "Ingresa un email válido";
    if (telefono && typeof telefono === "object") nuevos.telefono = telefono.error;
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          nombre: name.trim(),
          // Solo si cambió: cambiar el email también cambia con qué se inicia sesión.
          ...(email.trim().toLowerCase() !== (student.email || "").toLowerCase() ? { email: email.trim() } : {}),
          // Vacío → null: borra el dato (con `undefined` no se podía borrar).
          rut: rut.trim() || null,
          telefono,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrores({ general: data.error || "Error al actualizar" });
        setSaving(false);
        return;
      }
      toast.exito(`${name.trim()} actualizado`);
      onSaved();
      onClose();
    } catch {
      setErrores({ general: "Error de conexión al servidor" });
    }
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TITULO_POR_ROL[student.role] ?? "Editar usuario"}
      bloquearCierre={saving}
      footer={
        <>
          <Button variante="secundario" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} cargando={saving} textoCargando="Guardando...">Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Nombre completo" required error={errores.nombre}>
          {(p) => <input {...p} type="text" value={name} onChange={(e) => setName(e.target.value)} className={CLASE_INPUT} />}
        </FormField>
        <FormField label="Email" required ayuda="Es con el que inicia sesión." error={errores.email}>
          {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CLASE_INPUT} />}
        </FormField>
        <FormField label="RUT" ayuda="Déjalo vacío para borrarlo.">
          {(p) => <input {...p} type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" className={CLASE_INPUT} />}
        </FormField>
        <FormField label="Teléfono celular" ayuda="El bot de WhatsApp le escribe a este número. Déjalo vacío para borrarlo." error={errores.telefono}>
          {(p) => <PhoneInput {...p} value={phone} onChange={setPhone} />}
        </FormField>
        {errores.general && <p role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{errores.general}</p>}
      </div>
    </Modal>
  );
}
