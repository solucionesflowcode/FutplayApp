"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

type Student = {
  id: string;
  name: string;
  role: string;
  plan: string;
  tokens: number;
  status: string;
};

const students: Student[] = [
  { id: "#001", name: "Santiago Rodríguez", role: "Alumno", plan: "Elite Kids", tokens: 12, status: "Activo" },
  { id: "#002", name: "Valentina Espinoza", role: "Apoderado", plan: "Rendimiento Adultos", tokens: 5, status: "Inactivo" },
  { id: "#003", name: "Mateo Valencia", role: "Alumno", plan: "Rendimiento Adultos", tokens: 0, status: "Vencido" },
  { id: "#004", name: "Camila Soto", role: "Alumno", plan: "Elite Kids", tokens: 8, status: "Activo" },
  { id: "#005", name: "Diego Rojas", role: "Alumno", plan: "Elite Kids", tokens: 10, status: "Activo" },
  { id: "#006", name: "Fernanda Díaz", role: "Alumno", plan: "Rendimiento Adultos", tokens: 3, status: "Inactivo" },
];

export default function StudentsTable() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;

  const totalPages = Math.ceil(students.length / itemsPerPage);

  const currentData = students.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <div className="bg-white shadow-sm rounded-lg w-full p-4 mt-6">

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          
          {/* HEADER */}
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Nombre</th>
              <th className="p-3">Rol</th>
              <th className="p-3">Tipo de Plan</th>
              <th className="p-3">Tokens</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {currentData.map((student) => (
              <tr key={student.id} className="border-b hover:bg-gray-50">
                
                {/* Nombre + ID */}
                <td className="p-3">
                    <div className="font-semibold text-black">
    {student.name}
  </div>
  <div className="text-xs text-gray-400">
    {student.id}
  </div>
                  
                </td>

                <td className="p-3">
                <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.role === "Alumno"
                     ? "bg-blue-100 text-blue-700"
                     : "bg-purple-100 text-purple-700"
                    }`}
                        >
                             {student.role}
                </span>
                </td>

                <td className="p-3 text-gray-900 font-medium">
                    {student.plan}
                </td>

                <td className="p-3 text-gray-900 font-medium">
                    {student.tokens}
                </td>

                {/* Estado */}
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      student.status === "Activo"
                        ? "bg-green-100 text-green-600"
                        : student.status === "Inactivo"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {student.status}
                  </span>
                </td>

                {/* Acciones */}
                <td className="p-3 flex gap-2">
                  <button className="text-blue-500 hover:scale-110">
                    <Eye size={16} />
                  </button>
                  <button className="text-green-500 hover:scale-110">
                    <Pencil size={16} />
                  </button>
                  <button className="text-red-500 hover:scale-110">
                    <Trash2 size={16} />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-3">

        {/* TEXTO */}
        <span className="text-sm text-gray-500">
          Mostrando {(page - 1) * itemsPerPage + 1} a{" "}
          {Math.min(page * itemsPerPage, students.length)} de{" "}
          {students.length} registros
        </span>

        {/* PAGINACIÓN */}
        <div className="flex gap-2 items-center">

          {/* ANTERIOR */}
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Anterior
          </button>

          {/* BOTONES FIJOS 1 2 3 */}
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => setPage(num)}
              className={`px-3 py-1 border rounded ${
                page === num ? "bg-blue-500 text-white" : ""
              }`}
            >
              {num}
            </button>
          ))}

          {/* SIGUIENTE */}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Siguiente
          </button>

        </div>
      </div>

    </div>
  );
}