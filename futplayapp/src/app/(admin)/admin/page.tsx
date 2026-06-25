"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import StudentsTable, { Student } from "@/components/admin/StudentsTable";
import StatCard from "@/components/admin/StatCard";

import AdminHeader from "@/components/admin/AdminHeader";
import EditStudentModal from "@/components/admin/EditStudentModal";
import ViewStudentModal from "@/components/admin/ViewStudentModal";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { AuthGuard } from "@/context";
import { getUsers } from "@/data/plans";

export default function AdminPage() {
  return (
    <AuthGuard allowedRoles={["administrador"]}>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  const fetchUsers = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    const data = await getUsers();
    setStudents(data);
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const handleDelete = async (student: Student) => {
    setStudents((prev) => prev.filter((s) => s.id !== student.id));

    try {
      const res = await fetch(`/api/admin/students?id=${student.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setStudents((prev) => [...prev, student]);
        alert(data.error || "Error al eliminar");
      }
    } catch {
      setStudents((prev) => [...prev, student]);
      alert("Error de conexión al servidor");
    }
  };

  const q = search.toLowerCase();
  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.rut || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      s.plan.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q)
  );

  const total = filtered.length;
  const activos = filtered.filter((s) => s.status === "Activo").length;
  const vencidos = filtered.filter((s) => s.status === "Vencido").length;
  const inactivos = filtered.filter((s) => s.status === "Inactivo").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#F39200]" />
          <p className="text-gray-500">Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (

    <div className="p-6">
      <AdminHeader students={students} search={search} onSearchChange={setSearch} onView={setViewStudent} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Alumnos" value={total.toString()} color="bg-blue-500" />
        <StatCard title="Con Plan" value={(total - inactivos).toString()} color="bg-yellow-500" />
        <StatCard title="Activos" value={activos.toString()} color="bg-green-500" />
        <StatCard title="Pagos Vencidos" value={vencidos.toString()} color="bg-red-500" />
      </div>

      <StudentsTable
        students={filtered}
        onView={setViewStudent}
        onEdit={setEditStudent}
        onDelete={(s) => setDeleteStudent(s)}
      />

      <ConfirmDialog
        open={deleteStudent !== null}
        title="Eliminar estudiante"
        message={`¿Estás seguro de eliminar a "${deleteStudent?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (deleteStudent) handleDelete(deleteStudent);
          setDeleteStudent(null);
        }}
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