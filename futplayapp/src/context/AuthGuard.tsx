"use client";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "./AuthContext";
import { Loader2 } from "lucide-react";
import { Rol } from "./AuthContext";

/**
 * Props para el componente AuthGuard.
 */
interface AuthGuardProps {
  /** Contenido a renderizar si el usuario tiene acceso */
  children: ReactNode;
  /** Roles permitidos para ver el contenido. Si no se especifica, cualquier usuario logueado tiene acceso. */
  allowedRoles?: Rol[];
  /** Componente a mostrar si el usuario no tiene acceso */
  fallback?: ReactNode;
}

/**
 * Componente para proteger rutas basado en autenticación y roles.
 * 
 * Comportamiento:
 * - Muestra un loader mientras carga la sesión
 * - Redirige a /login si el usuario no está autenticado
 * - Redirige a /perfil si el usuario no tiene el rol requerido
 * - Muestra el fallback personalizado si está definido
 * 
 * @param {AuthGuardProps} props
 * @param {ReactNode} props.children - Contenido protegido
 * @param {Rol[]} [props.allowedRoles] - Roles con acceso permitido
 * @param {ReactNode} [props.fallback] - Componente fallback personalizado
 * 
 * @example
 * // Proteger para un rol específico
 * <AuthGuard allowedRoles={["administrador"]}>
 *   <PanelAdmin />
 * </AuthGuard>
 * 
 * @example
 * // Proteger para múltiples roles
 * <AuthGuard allowedRoles={["administrador", "profesor"]}>
 *   <ZonaReservada />
 * </AuthGuard>
 * 
 * @example
 * // Con fallback personalizado
 * <AuthGuard allowedRoles={["administrador"]} fallback={<NoAutorizado />}>
 *   <PanelAdmin />
 * </AuthGuard>
 */
export function AuthGuard({ children, allowedRoles, fallback }: AuthGuardProps) {
  const router = useRouter();
  const { user, usuario, loading, error } = useAuthUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#F39200]" />
      </div>
    );
  }

  if (error || !user) {
    if (fallback) return fallback;
    router.push("/login");
    return null;
  }

  if (allowedRoles && (!usuario || !allowedRoles.includes(usuario.rol))) {
    if (fallback) return fallback;
    router.push("/perfil");
    return null;
  }

  return <>{children}</>;
}
