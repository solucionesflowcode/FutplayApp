"use client";

import { useState } from "react";

import StudentsTable from "@/components/admin/StudentsTable";
import StatCard from "@/components/admin/StatCard";
import Sidebar from "@/components/admin/Sidebar";
import FabButton from "@/components/admin/FabButton";
import AdminHeader from "@/components/admin/AdminHeader";


export default function AdminPage() {

  // ✅ Estado del modal
  const [openModal, setOpenModal] = useState(false);

  // ✅ Estado de alumnos (AQUÍ estaba tu error)
  const [students, setStudents] = useState([
    {
      id: "#001",
      name: "Santiago Rodríguez",
      role: "Alumno",
      plan: "Elite Kids",
      tokens: 12,
      status: "Activo",
    },
    {
      id: "#002",
      name: "Valentina Espinoza",
      role: "Apoderado",
      plan: "Rendimiento Adultos",
      tokens: 5,
      status: "Inactivo",
    },
  ]);

  // ✅ Función para agregar alumno
  const addStudent = (newStudent: any) => {
    setStudents((prev) => [
      ...prev,
      {
        ...newStudent,
        id: `#00${prev.length + 1}`,
      },
    ]);
  };

  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Contenido derecha */}
      <main className="flex-1 p-6 w-full">

        {/* Header */}
        <AdminHeader onCreate={() => setOpenModal(true)} />

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Alumnos" value="1,284" color="bg-blue-500" />
          <StatCard title="Membresía Elite" value="412" color="bg-yellow-500" />
          <StatCard title="Activos" value="98%" color="bg-green-500" />
          <StatCard title="Pagos Vencidos" value="24" color="bg-red-500" />
        </div>

        {/* Tabla */}
        <StudentsTable students={students} />

        {/* Modal */}
        <CreateStudentModal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          onCreate={addStudent}
        />

      </main>

      {/* Botón flotante */}
      <FabButton />

    </div>
  );
}