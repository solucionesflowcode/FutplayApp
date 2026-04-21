"use client";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/context";
import { LogOut, Loader2 } from "lucide-react";

/**
 * Página de perfil del usuario.
 * Muestra el email, nombre y rol del usuario logueado.
 */
export default function Perfil() {
  const router = useRouter();
  const { user, usuario, loading, signOut } = useAuthUser();

  console.log("🔍 user:", user);
  console.log("🔍 usuario:", usuario);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center gap-6">
        <h1 className="text-xl font-semibold text-gray-800">Sesión activa</h1>

        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-600">Email:</p>
          <p className="text-[#F39200] font-medium">{user?.email || "No hay usuario"}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-600">Nombre:</p>
          <p className="text-[#F39200] font-medium">{usuario?.nombre || "No disponible"}</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-600">Rol:</p>
          <p className="text-[#F39200] font-medium capitalize">{usuario?.rol || "No disponible"}</p>
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
