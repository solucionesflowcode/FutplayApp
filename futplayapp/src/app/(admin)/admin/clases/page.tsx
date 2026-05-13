"use client";

import { BookOpen } from "lucide-react";

export default function ClasesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Clases</h1>
        <p className="text-gray-500 text-sm mt-1">
          Administra horarios, sedes y cupos de clases
        </p>
      </div>
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <div className="flex flex-col items-center justify-center text-gray-400 gap-3 py-12">
          <BookOpen className="w-12 h-12" />
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm">La gestión de clases estará disponible aquí.</p>
        </div>
      </div>
    </div>
  );
}
