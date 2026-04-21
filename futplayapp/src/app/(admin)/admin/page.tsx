"use client";

import { useState } from "react";
import StudentsTable from "@/components/admin/StudentsTable";
import StatCard from "@/components/admin/StatCard";

import FabButton from "@/components/admin/FabButton";
import AdminHeader from "@/components/admin/AdminHeader";
import CreateStudentModal from "@/components/admin/CreateStudentModal";

export default function AdminPage() {
  const [openModal, setOpenModal] = useState(false);  
  const [students, setStudents] = useState([
    { id: "#001", name: "Santiago Rodríguez", role: "Alumno", plan: "Elite Kids", tokens: 12, status: "Activo" },
    { id: "#002", name: "Valentina Espinoza", role: "Apoderado", plan: "Rendimiento Adultos", tokens: 5, status: "Inactivo" },
    { id: "#003", name: "Mateo Valencia", role: "Alumno", plan: "Rendimiento Adultos", tokens: 0, status: "Vencido" },
  ]);

  const addStudent = (newStudent: any) => {
    setStudents((prev) => [...prev, newStudent]);
  };

  return (
    
    <div className="p-6"> 
      <AdminHeader onCreate={() => setOpenModal(true)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Alumnos" value="1,284" color="bg-blue-500" />
        <StatCard title="Membresía Elite" value="412" color="bg-yellow-500" />
        <StatCard title="Activos" value="98%" color="bg-green-500" />
        <StatCard title="Pagos Vencidos" value="24" color="bg-red-500" />
      </div>

      <StudentsTable students={students} />

      <CreateStudentModal 
        open={openModal} 
        onClose={() => setOpenModal(false)}
        onSave={addStudent} 
      />  
      <FabButton />
    </div>
  );
}


/*modal es un componente que se muestra encima de la pantalla principal*/