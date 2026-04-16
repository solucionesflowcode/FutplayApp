"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, LogOut } from "lucide-react";

/**
 * Página de perfil del usuario.
 * Muestra el email del usuario logueado y permite cerrar sesión.
 * Esta página es temporal para probar autenticación - 
 * se reemplazará con el perfil completo de FutPlay.
 * 
 * Flujo:
 * 1. Carga la sesión actual del usuario
 * 2. Muestra el email si hay usuario logueado
 * 3. Permite cerrar sesión (redirige a /login)
 */
export default function Perfil() {
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string | null; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center gap-6">
        <h1 className="text-xl font-semibold text-gray-800">Sesión activa</h1>
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-600">Email:</p>
          <p className="text-[#F39200] font-medium">{user?.email || "No hay usuario"}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
