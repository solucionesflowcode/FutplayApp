"use client";

import { Search, Bell, Settings } from "lucide-react";

type Props = {
  onCreate: () => void;
};

export default function AdminHeader({ onCreate }: Props) {
  return (
    <div className="flex flex-col gap-4 mb-6">

      {/* 🔹 FILA 1: Buscador + acciones */}
      <div className="flex justify-between items-center gap-4">

        {/* BUSCADOR */}
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm text-black focus:outline-none"
          />
        </div>

        {/* DERECHA */}
        <div className="flex items-center gap-4">

            {/* Notificaciones */}
<button className="p-2 rounded-lg hover:bg-gray-200 transition">
        <Bell
    size={20}
    className="text-gray-700 hover:text-black transition"
  />
</button>

{/* Configuración */}
<button className="p-2 rounded-lg hover:bg-gray-200 transition">
  <Settings
    size={20}
    className="text-gray-700 hover:text-black transition"
  />
</button>

          

          {/* Usuario */}
          <div className="flex items-center gap-2">
            
            {/* Avatar */}
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>

            {/* Texto */}
            <div className="text-sm leading-tight">
              <p className="text-gray-500 text-xs">
                Admin Principal
              </p>
              <p className="font-bold text-black">
                Pablo Escobar
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* 🔹 FILA 2: Título + botón */}
      <div className="flex justify-between items-center">
        
        <h1 className="text-3xl font-extrabold text-black">
          Directorio de Alumnos
        </h1>

        <button
          onClick={onCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600"
        >
          + Nuevo registro
        </button>

      </div>

    </div>
  );
}