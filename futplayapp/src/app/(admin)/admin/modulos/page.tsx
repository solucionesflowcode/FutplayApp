"use client";

import { Layers } from "lucide-react";

export default function ModulosPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Módulos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Organiza los módulos de aprendizaje y categorías
        </p>
      </div>
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <div className="flex flex-col items-center justify-center text-gray-400 gap-3 py-12">
          <Layers className="w-12 h-12" />
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm">La gestión de módulos estará disponible aquí.</p>
        </div>
      </div>
    </div>
  );
}
