"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Users, GraduationCap, UserCheck, ShieldCheck, CreditCard, CheckCircle2, TriangleAlert } from "lucide-react";
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

  const total = students.length;
  const jugadores = students.filter((s) => s.role === "Alumno").length;
  const profesores = students.filter((s) => s.role === "Profesor").length;
  const admins = students.filter((s) => s.role === "Admin").length;
  const activos = students.filter((s) => s.status === "Activo").length;
  const vencidos = students.filter((s) => s.status === "Vencido").length;
  const inactivos = students.filter((s) => s.status === "Inactivo").length;

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

    <div className="p-4 sm:p-6">
      <AdminHeader
        search={search}
        onSearchChange={setSearch}
      />

      {/* Stats cards — diseño tipo pagos */}
      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-7 gap-1 sm:gap-4 md:gap-6 mb-8">
        {/* Total */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-[#00305B]" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <Users className="w-1.5 h-1.5 sm:w-4 sm:h-4 text-[#00305B]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{total}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">usuarios</p>
        </div>

        {/* Alumnos */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <GraduationCap className="w-1.5 h-2 sm:w-4 sm:h-5 text-[#6366F1]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Alumnos</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{jugadores}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">estudiantes</p>
        </div>

        {/* Profesores */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-purple-600" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <UserCheck className="w-1.5 h-1.5 sm:w-5 sm:h-5 text-[#8B5CF6]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Profesores</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{profesores}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">instructores</p>
        </div>

        {/* Administrador */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-[#F39200]" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <ShieldCheck className="w-1.5 h-2 sm:w-4 sm:h-5 text-[#F39200]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Admins</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{admins}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">supervisores</p>
        </div>

        {/* Con Plan */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <CreditCard className="w-1.5 h-1.5 sm:w-4 sm:h-4 text-[#00A86B]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Con Plan</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{total - inactivos}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">membresías</p>
        </div>

        {/* Activos */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-green-400 to-[#00A86B]" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <CheckCircle2 className="w-1.5 h-1.5 sm:w-4 sm:h-4 text-[#00A86B]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Activos</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{activos}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">al día</p>
        </div>

        {/* Vencidos */}
        <div className="relative bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center p-1 sm:p-4 rounded-full aspect-square w-full mx-auto overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 sm:top-2 left-1/2 -translate-x-1/2 w-3 sm:w-10 h-px sm:h-1.5 rounded-full bg-gradient-to-r from-rose-400 to-red-500" />
          <div className="w-3 h-3 sm:w-9 sm:h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-0 sm:mb-2 transition-colors group-hover:bg-slate-100">
            <TriangleAlert className="w-1.5 h-1.5 sm:w-4 sm:h-4 text-[#ba1a1a]" />
          </div>
          <div className="hidden sm:block w-3 sm:w-6 h-px sm:h-[2px] bg-slate-100 mb-0 sm:mb-1.5 rounded-full" />
          <span className="text-[7px] leading-[1.15] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400">Vencidos</span>
          <p className="text-[14px] sm:text-base md:text-lg font-black text-[#00305B] leading-none my-0 sm:my-1 truncate max-w-full px-0 sm:px-1">{vencidos}</p>
          <p className="text-[7px] sm:text-[9px] text-slate-500 font-medium mt-0">morosos</p>
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