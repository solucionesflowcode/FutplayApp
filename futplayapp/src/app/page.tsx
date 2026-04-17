"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthUser } from "@/context";
import { Loader2 } from "lucide-react";

/**
 * Página raíz de la aplicación.
 * Detecta si hay un usuario autenticado y redirige según su rol.
 * 
 * Redirecciones:
 * - Sin usuario → /login
 * - administrador → /admin
 * - profesor → /dashboard
 * - jugador → /dashboard
 */
export default function Home() {
  const router = useRouter();
  const { usuario, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;

    if (!usuario) {
      router.replace("/login");
      return;
    }

    switch (usuario.rol) {
      case "administrador":
        router.replace("/admin");
        break;
      case "profesor":
        router.replace("/dashboard");
        break;
      case "jugador":
        router.replace("/dashboard");
        break;
      default:
        router.replace("/login");
    }
  }, [usuario, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  return <p>Redirigiendo...</p>;
}
