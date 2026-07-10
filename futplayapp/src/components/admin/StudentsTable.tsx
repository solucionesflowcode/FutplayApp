"use client";

import { useState, Fragment } from "react";
import { Eye, Pencil, Trash2, Heart, X, Loader2 } from "lucide-react";
import { getFichaMedicaByUser, calcularEdad, type FichaMedicaData } from "@/data/fichaMedica";

export type Student = {
  id: string;
  name: string;
  role: string;
  rut?: string;
  phone?: string;
  plan: string;
  tokens: number;
  status: string;
  medicalFileUrl?: string;
};

type FichaModalState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: (FichaMedicaData & { usuario_id: string }) | null;
};

type Props = {
  students: Student[];
  onView?: (student: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
};

export default function StudentsTable({ students, onView, onEdit, onDelete }: Props) {

  const [page, setPage] = useState(1);
  const [fichaModal, setFichaModal] = useState<FichaModalState>({
    open: false, loading: false, error: null, data: null,
  });
  const itemsPerPage = 4;

  const totalPages = Math.ceil(students.length / itemsPerPage);

  const currentData = students.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const openFicha = async (userId: string) => {
    setFichaModal({ open: true, loading: true, error: null, data: null });
    const data = await getFichaMedicaByUser(userId);
    if (data) {
      setFichaModal({ open: true, loading: false, error: null, data });
    } else {
      setFichaModal({ open: true, loading: false, error: "No tiene ficha médica registrada.", data: null });
    }
  };

  const closeFicha = () => {
    setFichaModal({ open: false, loading: false, error: null, data: null });
  };

  return (
    <div className="bg-white shadow-sm rounded-lg w-full p-4 mt-6">

      {/* TABLA */}
      <div className="md:overflow-x-auto">
        <table className="w-full text-sm md:min-w-[800px]">

          <thead className="hidden md:table-header-group">
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
              <Fragment key={student.id}>
                {/* MOBILE CARD */}
                <tr className="md:hidden border-b border-gray-100">
                  <td colSpan={8} className="p-0">
                    <div className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-black truncate text-sm">{student.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{student.id}</p>
                        </div>
                        <span className={`shrink-0 ml-2 px-2 py-0.5 rounded text-[10px] font-medium ${
                          student.status === "Activo"
                            ? "bg-green-100 text-green-600"
                            : student.status === "Inactivo"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-red-100 text-red-600"
                        }`}>{student.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]">
                        {student.rut && <div><span className="text-gray-400">RUT: </span><span className="font-medium text-gray-700">{student.rut}</span></div>}
                        {student.phone && <div><span className="text-gray-400">Tel: </span><span className="font-medium text-gray-700">{student.phone}</span></div>}
                        <div><span className="text-gray-400">Plan: </span><span className="font-medium text-gray-700">{student.plan}</span></div>
                        <div><span className="text-gray-400">Tokens: </span><span className="font-medium text-gray-700">{student.tokens}</span></div>
                        <div><span className="text-gray-400">Rol: </span><span className={`font-medium ${
                          student.role === "Alumno" ? "text-blue-700" : "text-purple-700"
                        }`}>{student.role}</span></div>
                      </div>
                      <div className="flex gap-2 items-center pt-1.5 border-t border-gray-50">
                        <button onClick={() => openFicha(student.id)} className="flex items-center gap-1 text-purple-600 text-[10px] border px-2 py-1 rounded hover:bg-purple-100">
                          <Heart size={11} /> Ficha
                        </button>
                        <button onClick={() => onView?.(student)} className="text-blue-500 hover:scale-110 p-1"><Eye size={14} /></button>
                        <button onClick={() => onEdit?.(student)} className="text-green-500 hover:scale-110 p-1"><Pencil size={14} /></button>
                        <button onClick={() => onDelete?.(student)} className="text-red-500 hover:scale-110 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </td>
                </tr>
                {/* DESKTOP ROW */}
                <tr className="hidden md:table-row border-b hover:bg-gray-50">

                  <td className="p-3 max-w-[200px]">
                    <div className="font-semibold text-black truncate">
                      {student.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
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
                    {student.rut}
                  </td>

                  <td className="p-3 text-gray-900 font-medium">
                    {student.phone}
                  </td>

                  <td className="p-3 text-gray-900 font-medium">
                    {student.plan}
                  </td>

                  <td className="p-3 text-gray-900 font-medium">
                    {student.tokens}
                  </td>

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

                  <td className="p-3 flex gap-2 items-center">

                    <button
                      onClick={() => openFicha(student.id)}
                      className="flex items-center gap-1 text-purple-600 text-xs border px-2 py-1 rounded hover:bg-purple-100"
                    >
                      <Heart size={14} />
                      Ficha
                    </button>

                    <button onClick={() => onView?.(student)} className="text-blue-500 hover:scale-110">
                      <Eye size={16} />
                    </button>

                    <button onClick={() => onEdit?.(student)} className="text-green-500 hover:scale-110">
                      <Pencil size={16} />
                    </button>

                    <button onClick={() => onDelete?.(student)} className="text-red-500 hover:scale-110">
                      <Trash2 size={16} />
                    </button>

                  </td>

                </tr>
              </Fragment>
            ))}
          </tbody>

        </table>
      </div>

      {/* FICHA MÉDICA MODAL */}
      {fichaModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-t-2 border-t-[#F28C28] shadow-xl ring-1 ring-inset ring-black/[0.03] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ficha Médica</h2>
              <button onClick={closeFicha} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {fichaModal.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
              </div>
            )}

            {fichaModal.error && (
              <div className="p-4 bg-gray-50 rounded text-center text-gray-500">
                {fichaModal.error}
              </div>
            )}

            {fichaModal.data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Edad</p>
                    <p className="font-semibold text-gray-900">{calcularEdad(fichaModal.data.fecha_nacimiento)} años</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Peso</p>
                    <p className="font-semibold text-gray-900">{fichaModal.data.peso_kg} kg</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Estatura</p>
                    <p className="font-semibold text-gray-900">{fichaModal.data.estatura_cm} cm</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">IMC</p>
                    <p className="font-semibold text-gray-900">{fichaModal.data.imc}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Grupo Sanguíneo</p>
                    <p className="font-semibold text-gray-900">{fichaModal.data.grupo_sanguineo || "—"}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Enfermedades</p>
                  <p className="font-medium text-gray-900">{fichaModal.data.enfermedades || "Ninguna"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Alergias</p>
                  <p className="font-medium text-gray-900">{fichaModal.data.alergias || "Ninguna"}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Medicamentos</p>
                  <p className="font-medium text-gray-900">{fichaModal.data.medicamentos || "Ninguno"}</p>
                </div>
                {fichaModal.data.observaciones && (
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-500">Observaciones</p>
                    <p className="font-medium text-gray-900">{fichaModal.data.observaciones}</p>
                  </div>
                )}

                <button
                  onClick={closeFicha}
                  className="w-full mt-2 py-2 rounded bg-gray-900 text-white font-medium hover:bg-gray-800"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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