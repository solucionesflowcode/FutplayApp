"use client";

import { useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

type Student = {
  id: string;
  name: string;
  role: string; // se muestra como "Usuario"
  rut: string;
  phone: string;
  plan: string;
  tokens: number;
  status: string;
  medicalFileUrl?: string; // 👈 PRO (para Supabase)
};

type Props = {
  students: Student[];
};

export default function StudentsTable({ students }: Props) {

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

          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Nombre</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">RUT</th>
              <th className="p-3">Teléfono</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Tokens</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {currentData.map((student) => (
              <tr key={student.id} className="border-b hover:bg-gray-50">

                {/* Nombre */}
                <td className="p-3">
                  <div className="font-semibold text-black">
                    {student.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {student.id}
                  </div>
                </td>

                {/* Usuario */}
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

                {/* RUT */}
                <td className="p-3 text-gray-900 font-medium">
                  {student.rut}
                </td>

                {/* Teléfono */}
                <td className="p-3 text-gray-900 font-medium">
                  {student.phone}
                </td>

                {/* Plan */}
                <td className="p-3 text-gray-900 font-medium">
                  {student.plan}
                </td>

                {/* Tokens */}
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

                {/* ACCIONES */}
                <td className="p-3 flex gap-2 items-center">

                  {/* VER FICHA MÉDICA (PRO READY) */}
                  {student.medicalFileUrl && (
                    <button
                      onClick={() => window.open(student.medicalFileUrl)}
                      className="text-purple-600 text-xs border px-2 py-1 rounded hover:bg-purple-100"
                    >
                      Ver ficha
                    </button>
                  )}

                  {/* VER */}
                  <button className="text-blue-500 hover:scale-110">
                    <Eye size={16} />
                  </button>

                  {/* EDITAR */}
                  <button className="text-green-500 hover:scale-110">
                    <Pencil size={16} />
                  </button>

                  {/* ELIMINAR */}
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

        <span className="text-sm text-gray-500">
          Mostrando {(page - 1) * itemsPerPage + 1} a{" "}
          {Math.min(page * itemsPerPage, students.length)} de{" "}
          {students.length} registros
        </span>

        <div className="flex gap-2 items-center">

  {/* ANTERIOR */}
  <button
    onClick={() => setPage(page - 1)}
    disabled={page === 1}
    className="
      px-4 py-2 rounded-lg font-medium
      bg-white border border-gray-300
      text-gray-700
      hover:bg-blue-50 hover:text-blue-600
      disabled:opacity-40 disabled:cursor-not-allowed
      transition-all
    "
  >
    Anterior
  </button>

  {/* NÚMEROS */}
  {[1, 2, 3]
    .filter((n) => n <= totalPages)
    .map((num) => (
      <button
        key={num}
        onClick={() => setPage(num)}
        className={`
          px-4 py-2 rounded-lg font-semibold
          border transition-all
          ${
            page === num
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600"
          }
        `}
      >
        {num}
      </button>
  ))}

  {/* SIGUIENTE */}
  <button
    onClick={() => setPage(page + 1)}
    disabled={page === totalPages}
    className="
      px-4 py-2 rounded-lg font-medium
      bg-white border border-gray-300
      text-gray-700
      hover:bg-blue-50 hover:text-blue-600
      disabled:opacity-40 disabled:cursor-not-allowed
      transition-all
    "
  >
    Siguiente
  </button>

</div>    

      </div>

    </div>
  );
}