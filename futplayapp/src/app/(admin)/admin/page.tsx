"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import StudentsTable, { Student } from "@/components/admin/StudentsTable";

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
  const jugadores = filtered.filter((s) => s.role === "Alumno").length;
  const profesores = filtered.filter((s) => s.role === "Profesor").length;
  const admins = filtered.filter((s) => s.role === "Admin").length;
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
      <AdminHeader
        search={search}
        onSearchChange={setSearch}
      />

      <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-6 max-w-2xl">
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#00305B] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{total}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Total</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#6366F1] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{jugadores}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Alumnos</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#8B5CF6] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{profesores}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Profesores</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#F39200] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{admins}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Administrador</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#F28C28] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{total - inactivos}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Con Plan</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#00A86B] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{activos}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Activos</p>
        </div>
        <div className="w-full aspect-square bg-white border border-gray-200 shadow-sm border-t-2 border-t-[#ba1a1a] rounded-full flex flex-col items-center justify-center text-center p-1 hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer">
          <p className="text-sm md:text-base font-black text-gray-800 leading-none">{vencidos}</p>
          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5 leading-tight">Vencidos</p>
        </div>
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