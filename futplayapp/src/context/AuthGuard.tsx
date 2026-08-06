"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "./AuthContext";
import { Loader2, Lock, LogIn, ShieldX } from "lucide-react";
import { Rol } from "./AuthContext";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: Rol[];
  fallback?: ReactNode;
}

function rutaPorRol(rol: Rol | undefined): string {
  switch (rol) {
    case "administrador":
      return "/admin";
    case "profesor":
      return "/profesor";
    case "jugador":
      return "/dashboard";
    default:
      return "/login";
  }
}

function AuthOverlay({
  icon,
  title,
  description,
  buttonText,
  buttonAction,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonAction: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001220]/80 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl border-t-2 border-t-[#F39200] shadow-2xl p-10 max-w-sm w-full mx-4 text-center overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F39200]/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#00305B]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-full bg-[#F39200]/10 flex items-center justify-center mx-auto mb-6 relative">
          {icon}
        </div>

        <h2 className="text-2xl font-extrabold text-[#00305B] mb-2 leading-tight">
          {title}
        </h2>

        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          {description}
        </p>

        <button
          onClick={buttonAction}
          className="w-full flex items-center justify-center gap-2 py-3 rounded bg-gradient-to-r from-[#F39200] to-[#e07d1f] text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
        >
          <LogIn size={16} />
          {buttonText}
        </button>
      </div>
    </div>
  );
}

export function AuthGuard({ children, allowedRoles, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { user, usuario, loading, error } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!error && !user) return;
    if (allowedRoles && usuario && !allowedRoles.includes(usuario.rol)) {
      router.push(rutaPorRol(usuario.rol));
    }
  }, [loading, error, user, usuario, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  if (error || !user) {
    if (fallback) return fallback;
    return (
      <AuthOverlay
        icon={<Lock className="text-[#F39200]" size={28} />}
        title="Sesión requerida"
        description="Necesitas iniciar sesión para acceder a esta sección."
        buttonText="Iniciar sesión"
        buttonAction={() => router.push("/login")}
      />
    );
  }

  if (allowedRoles && (!usuario || !allowedRoles.includes(usuario.rol))) {
    if (fallback) return fallback;
    return (
      <AuthOverlay
        icon={<ShieldX className="text-[#F39200]" size={28} />}
        title="Acceso restringido"
        description={`No tienes los permisos necesarios para acceder a esta sección.`}
        buttonText="Ir al inicio"
        buttonAction={() => router.push(rutaPorRol(usuario?.rol))}
      />
    );
  }

  return <>{children}</>;
}
