"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/context";
import { Loader2, LogOut, User, Mail, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PerfilPage() {
  const router = useRouter();
  const { user, usuario, loading, error, signOut } = useAuthUser();

  const handleSignOut = async () => {
    await signOut();
    router.push("/home");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    administrador: "Administrador",
    profesor: "Profesor",
    jugador: "Jugador",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#F39200] p-6 text-white text-center relative">
          <Link
            href="/home"
            className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-xl font-bold">Mi Perfil</h1>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {usuario && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <User className="w-5 h-5 text-[#F39200]" />
                <div>
                  <p className="text-xs text-gray-500">Nombre</p>
                  <p className="font-medium text-gray-900">{usuario.nombre}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="w-5 h-5 text-[#F39200]" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user?.email ?? "—"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Shield className="w-5 h-5 text-[#F39200]" />
                <div>
                  <p className="text-xs text-gray-500">Rol</p>
                  <p className="font-medium text-gray-900">
                    {roleLabel[usuario.rol] ?? usuario.rol}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!usuario && !error && (
            <p className="text-center text-gray-500 py-4">
              No se pudieron cargar los datos del perfil.
            </p>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
