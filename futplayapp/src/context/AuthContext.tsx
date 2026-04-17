"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

/**
 * Tipos de rol disponibles en el sistema.
 * @enum {string}
 */
export type Rol = "jugador" | "profesor" | "administrador";

/**
 * Representa un usuario de la tabla 'usuario' en Supabase.
 * @typedef {Object} Usuario
 * @property {string} id - ID del usuario (coincide con auth.users.id)
 * @property {string} nombre - Nombre del usuario
 * @property {Rol} rol - Rol del usuario
 * @property {string} [email] - Email opcional
 */
export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
  email?: string;
}

/**
 * Estado del contexto de autenticación.
 * @typedef {Object} AuthContextType
 * @property {User | null} user - Usuario de Supabase Auth (contiene email, id, etc.)
 * @property {Usuario | null} usuario - Datos del usuario de la tabla 'usuario' (id, nombre, rol)
 * @property {boolean} loading - Indica si está cargando la sesión
 * @property {string | null} error - Mensaje de error si ocurre alguno
 * @property {() => Promise<void>} signOut - Función para cerrar sesión
 * @property {() => Promise<void>} refreshUser - Función para recargar datos del usuario
 */
interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Proveedor del contexto de autenticación.
 * Debe envolver toda la aplicación en layout.tsx.
 * 
 * Maneja:
 * - Carga inicial del usuario desde Supabase Auth
 * - Consulta a la tabla 'usuario' para obtener nombre y rol
 * - Escucha de cambios en el estado de autenticación
 * - Cierre de sesión
 * 
 * @param {Object} props
 * @param {ReactNode} props.children - Componentes hijos
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtiene los datos del usuario desde la tabla 'usuario'.
   * Usa useCallback para evitar recrear la función en cada render.
   * @param {string} userId - ID del usuario de Supabase Auth
   */
  const fetchUsuario = useCallback(async (userId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("usuario")
        .select("id, nombre, rol")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error("[AuthContext] Error al obtener usuario de la tabla:", fetchError.message);
        setError(`Error al obtener datos del usuario: ${fetchError.message}`);
        setUsuario(null);
        return;
      }

      setUsuario(data);
      setError(null);
    } catch (err) {
      console.error("[AuthContext] Error inesperado al obtener usuario:", err);
      setError("Error inesperado al obtener datos del usuario");
      setUsuario(null);
    }
  }, [supabase]);

  /**
   * Carga el usuario actual y sus datos.
   * Usa useCallback para evitar recrear la función en cada render.
   */
  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("[AuthContext] Error de autenticación:", authError.message);
        setError(`Error de autenticación: ${authError.message}`);
        setUser(null);
        setUsuario(null);
        setLoading(false);
        return;
      }

      setUser(user);

      if (user) {
        await fetchUsuario(user.id);
      } else {
        setUsuario(null);
      }
    } catch (err) {
      console.error("[AuthContext] Error inesperado al cargar usuario:", err);
      setError("Error al cargar usuario");
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchUsuario]);

  /**
   * Cierra la sesión del usuario.
   * Limpia el estado local y las cookies de Supabase.
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUsuario(null);
      setError(null);
    } catch (err) {
      console.error("[AuthContext] Error al cerrar sesión:", err);
      setError("Error al cerrar sesión");
    }
  };

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchUsuario(session.user.id);
      } else {
        setUsuario(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUser, fetchUsuario]);

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        loading,
        error,
        signOut,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación.
 * Debe usarse dentro de un AuthProvider.
 * 
 * @returns {AuthContextType} Estado de autenticación con:
 * - user: Usuario de Supabase Auth
 * - usuario: Datos de la tabla usuario (id, nombre, rol)
 * - loading: Estado de carga
 * - error: Mensaje de error
 * - signOut: Función para cerrar sesión
 * - refreshUser: Función para recargar datos
 * 
 * @throws {Error} Si se usa fuera de un AuthProvider
 */
export function useAuthUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthUser debe usarse dentro de un AuthProvider");
  }
  return context;
}
