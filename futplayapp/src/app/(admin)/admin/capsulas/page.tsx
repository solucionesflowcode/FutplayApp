"use client";

import { Video } from "lucide-react";

export default function CapsulasPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Cápsulas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Administra las cápsulas de video y contenido E-learning
        </p>
      </div>
      <div className="bg-white rounded-xl p-8 border border-gray-200">
        <div className="flex flex-col items-center justify-center text-gray-400 gap-3 py-12">
          <Video className="w-12 h-12" />
          <p className="text-lg font-medium">Próximamente</p>
          <p className="text-sm">La gestión de cápsulas estará disponible aquí.</p>
        </div>
      </div>
    </div>
  );
}
