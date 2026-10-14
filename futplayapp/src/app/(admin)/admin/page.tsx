"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, GraduationCap, UserCheck, ShieldCheck, CheckCircle2, Snowflake, TriangleAlert, CreditCard } from "lucide-react";
import StudentsTable, { Student } from "@/components/admin/StudentsTable";
import EditStudentModal from "@/components/admin/EditStudentModal";
import ViewStudentModal from "@/components/admin/ViewStudentModal";
import { CLASE_INPUT, ConfirmDialog, PageHeader, StatCard, useAdminMutation } from "@/components/admin/ui";
import { getUsers } from "@/data/plans";

// El layout del admin ya protege la ruta con AuthGuard (antes se repetía aquí).

type Filtro =
  | { campo: "rol"; valor: "Alumno" | "Profesor" | "Admin" }
  | { campo: "estado"; valor: "Activo" | "Congelado" | "Vencido" | "Inactivo" }
  | null;

function coincideFiltro(s: Student, f: Filtro): boolean {
  if (!f) return true;
  if (f.campo === "rol") return s.role === f.valor;
  // Los estados de plan se refieren a alumnos (un profesor "sin plan" no es un dato útil).
  return s.role === "Alumno" && s.status === f.valor;
}

function coincideBusqueda(s: Student, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  const digitos = q.replace(/\D/g, "");
  return (
    s.name.toLowerCase().includes(q) ||
    (s.email || "").toLowerCase().includes(q) ||
    (s.rut || "").toLowerCase().includes(q) ||
    // El teléfono se busca por dígitos: "7904 6977" encuentra +56979046977.
    (digitos.length >= 3 && (s.phone || "").replace(/\D/g, "").includes(digitos)) ||
    s.plan.toLowerCase().includes(q)
  );
}

export default function AdminPage() {
  const { ejecutar } = useAdminMutation();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(null);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const reintentar = () => {
    setLoading(true);
    fetchUsers();
  };
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getUsers();
      setStudents(data);
      setErrorCarga(null);
    } catch (err) {
      setErrorCarga(err instanceof Error ? err.message : "No se pudieron cargar los datos");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async () => {
    if (!deleteStudent) return;
    const s = deleteStudent;
    const anterior = students;
    setEliminando(true);
    setStudents((prev) => prev.filter((x) => x.id !== s.id));
    // Antes: alert() y el usuario volvía al final de la lista si fallaba (USR-07).
    await ejecutar(
      async () => {
        const res = await fetch(`/api/admin/students?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, error: data.error };
      },
      { exito: `${s.name} eliminado`, error: `No se pudo eliminar a ${s.name}`, revertir: () => setStudents(anterior) }
    );
    setEliminando(false);
    setDeleteStudent(null);
  };

  const filtered = students.filter((s) => coincideBusqueda(s, search) && coincideFiltro(s, filtro));
  const alumnos = students.filter((s) => s.role === "Alumno");
  const cuenta = (pred: (s: Student) => boolean, lista = students) => lista.filter(pred).length;
  const alternar = (f: NonNullable<Filtro>) =>
    setFiltro((actual) => (actual && actual.campo === f.campo && actual.valor === f.valor ? null : f));
  const activo = (f: NonNullable<Filtro>) => filtro?.campo === f.campo && filtro.valor === f.valor;

  const tarjetas: { filtro: NonNullable<Filtro>; etiqueta: string; valor: number; detalle: string; icono: React.ReactNode; tono?: "neutro" | "exito" | "alerta" | "peligro" }[] = [
    { filtro: { campo: "rol", valor: "Alumno" }, etiqueta: "Alumnos", valor: alumnos.length, detalle: "estudiantes", icono: <GraduationCap size={18} /> },
    { filtro: { campo: "rol", valor: "Profesor" }, etiqueta: "Profesores", valor: cuenta((s) => s.role === "Profesor"), detalle: "instructores", icono: <UserCheck size={18} /> },
    { filtro: { campo: "rol", valor: "Admin" }, etiqueta: "Admins", valor: cuenta((s) => s.role === "Admin"), detalle: "administradores", icono: <ShieldCheck size={18} /> },
    { filtro: { campo: "estado", valor: "Activo" }, etiqueta: "Activos", valor: cuenta((s) => s.status === "Activo", alumnos), detalle: "con tokens disponibles", icono: <CheckCircle2 size={18} />, tono: "exito" },
    { filtro: { campo: "estado", valor: "Congelado" }, etiqueta: "Congelados", valor: cuenta((s) => s.status === "Congelado", alumnos), detalle: "plan en pausa", icono: <Snowflake size={18} />, tono: "alerta" },
    // Antes decía "morosos": incluye a quien se quedó sin tokens o le venció el plan (USR-08).
    { filtro: { campo: "estado", valor: "Vencido" }, etiqueta: "Vencidos", valor: cuenta((s) => s.status === "Vencido", alumnos), detalle: "sin tokens o plan vencido", icono: <TriangleAlert size={18} />, tono: "peligro" },
    { filtro: { campo: "estado", valor: "Inactivo" }, etiqueta: "Sin plan", valor: cuenta((s) => s.status === "Inactivo", alumnos), detalle: "nunca compraron", icono: <CreditCard size={18} /> },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full max-w-[1216px] mx-auto">
        <PageHeader
          titulo="Gestión de usuarios"
          descripcion={`${students.length} usuarios registrados`}
        >
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
            <input
              type="search"
              aria-label="Buscar usuarios"
              placeholder="Buscar por nombre, email, RUT, teléfono o plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${CLASE_INPUT} pl-9 py-2`}
            />
          </div>
        </PageHeader>

        {/* Tarjetas legibles en móvil que además filtran la tabla (USR-08). */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {tarjetas.map((t) => (
            <StatCard
              key={t.etiqueta}
              etiqueta={t.etiqueta}
              valor={t.valor}
              detalle={t.detalle}
              icono={t.icono}
              tono={t.tono}
              activa={activo(t.filtro)}
              onClick={() => alternar(t.filtro)}
            />
          ))}
        </div>

        {filtro && (
          <p className="text-sm text-gray-500 mb-3">
            Mostrando: <strong>{tarjetas.find((t) => activo(t.filtro))?.etiqueta}</strong>{" "}
            <button type="button" onClick={() => setFiltro(null)} className="text-marca font-semibold hover:underline">Quitar filtro</button>
          </p>
        )}

        <StudentsTable
          students={filtered}
          cargando={loading}
          error={errorCarga}
          onReintentar={reintentar}
          resetKey={`${search}|${filtro?.campo ?? ""}:${filtro?.valor ?? ""}`}
          onView={setViewStudent}
          onEdit={setEditStudent}
          onDelete={setDeleteStudent}
        />
      </div>

      <ConfirmDialog
        open={deleteStudent !== null}
        title="Eliminar usuario"
        message={<>¿Eliminar a <strong>{deleteStudent?.name}</strong>? No se puede deshacer.</>}
        consecuencias={[
          "Se borra su cuenta: ya no podrá iniciar sesión.",
          "Se eliminan sus membresías, reservas, ficha médica y comentarios.",
          "Si tiene pagos registrados, no se puede eliminar.",
        ]}
        confirmLabel="Eliminar"
        textoCargando="Eliminando..."
        cargando={eliminando}
        onConfirm={handleDelete}
        onCancel={() => setDeleteStudent(null)}
      />

      <EditStudentModal
        student={editStudent}
        open={editStudent !== null}
        onClose={() => setEditStudent(null)}
        onSaved={fetchUsers}
      />

      <ViewStudentModal
        student={viewStudent}
        open={viewStudent !== null}
        onClose={() => setViewStudent(null)}
      />
    </div>
  );
}
