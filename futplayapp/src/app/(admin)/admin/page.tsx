"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import StudentsTable, { Student } from "@/components/admin/StudentsTable";
import StatCard from "@/components/admin/StatCard";

import FabButton from "@/components/admin/FabButton";
import AdminHeader from "@/components/admin/AdminHeader";
import CreateStudentModal from "@/components/admin/CreateStudentModal";
import { getUsers } from "@/data/plans";

export default function AdminPage() {
  const [openModal, setOpenModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const data = await getUsers();
    setStudents(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreated = () => {
    fetchUsers();
  };

  const total = students.length;
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

    <div className="p-6">
      <AdminHeader onCreate={() => setOpenModal(true)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Alumnos" value={total.toString()} color="bg-blue-500" />
        <StatCard title="Con Plan" value={(total - inactivos).toString()} color="bg-yellow-500" />
        <StatCard title="Activos" value={activos.toString()} color="bg-green-500" />
        <StatCard title="Pagos Vencidos" value={vencidos.toString()} color="bg-red-500" />
      </div>

      <StudentsTable students={students} />

      <CreateStudentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={handleCreated}
      />
      <FabButton />
    </div>
  );
}