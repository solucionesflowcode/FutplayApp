"use client";

import { Search } from "lucide-react";

type Props = {
  search?: string;
  onSearchChange?: (value: string) => void;
};

export default function AdminHeader({ search, onSearchChange }: Props) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT, teléfono, plan..."
            value={search || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm text-black focus:outline-none"
          />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-black">
        Directorio de Usuarios
      </h1>
    </div>
  );
}
