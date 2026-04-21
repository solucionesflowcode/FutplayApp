
/*ingresar alumno
guardar alumno
mandarlo a la tabla*/

"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (student: any) => void;   
};

export default function CreateStudentModal({
  open, onClose, onSave
}: Props) {

  const [userType, setUserType] =
    useState("Alumno");

    const saveStudent = () => {

  onSave({
    id: "#" + Date.now(),
    name: "Nuevo Usuario",
    role: userType,
    plan: "Plan Híbrido",
    tokens: 0,
    status: "Activo"
  });

  onClose();
};

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">

      <div className="
        bg-white
        rounded-2xl
        shadow-xl
        w-full
        max-w-lg
        p-8
      ">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Registro de Usuarios
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Registro manual administrativo.
          </p>
        </div>

        {/* Nombre */}
        <input
          type="text"
          placeholder="Nombre"
          className="
            w-full border border-gray-300
            text-black p-3 rounded-xl mb-4
          "
        />

        {/* Apellido */}
        <input
          type="text"
          placeholder="Apellido"
          className="
            w-full border border-gray-300
            text-black p-3 rounded-xl mb-4
          "
        />

        {/* Fecha nacimiento */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de nacimiento
            </label>

            <input
            type="date"
            className="
                        w-full border border-gray-300
                         text-black p-3 rounded-xl mb-4
                                                        "
/>

        {/* Tipo Usuario */}
        <select
          value={userType}
          onChange={(e)=>
            setUserType(e.target.value)
          }
          className="
            w-full border border-gray-300
            text-black p-3 rounded-xl mb-4
          "
        >
          <option>Alumno</option>
          <option>Apoderado</option>
        </select>

        {/* Tipo Plan */}
        <select
          defaultValue=""
          className="
            w-full border border-gray-300
            text-black p-3 rounded-xl mb-4
          "
        >

          <option value="" disabled>
            Seleccionar tipo de plan
          </option>

          <option value="hibrido">
            Plan Híbrido
          </option>

          <option value="online">
            Plan Online
          </option>

        </select>

        {/* Ficha médica */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subir ficha médica
        </label>

        <input
          type="file"
          className="
            w-full border border-gray-300
            p-3 rounded-xl mb-4
          "
        />

        {/* SOLO SI ES APODERADO */}
        {userType === "Apoderado" && (

          <div>

            <input
              type="number"
              placeholder="Cantidad de hijos asociados"
              className="
                w-full border border-gray-300
                text-black p-3 rounded-xl mb-4
              "
            />

            <input
              type="text"
              placeholder="Nombre del hijo"
              className="
                w-full border border-gray-300
                text-black p-3 rounded-xl mb-4
              "
            />

            <select
              defaultValue=""
              className="
                w-full border border-gray-300
                text-black p-3 rounded-xl mb-6
              "
            >

              <option value="" disabled>
                Seleccionar plan del hijo
              </option>

              <option value="hibrido">
                Plan Híbrido
              </option>

              <option value="online">
                Plan Online
              </option>

            </select>

          </div>

        )}

        {/* Botones */}
        <div className="flex justify-end gap-3">

          <button
          onClick={onClose}
            className="
              px-4 py-2 rounded-xl
              border border-gray-300
            "
          >
            Cancelar
          </button>

          <button
          onClick={saveStudent}
          className="bg-blue-600 text-white
    px-5 py-2 rounded-xl
    hover:bg-blue-700"
          >

            Guardar Registro
          </button>

        </div>

      </div>
        
    </div>
    
  );
  
  
}