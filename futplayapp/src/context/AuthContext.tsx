"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { getCurrentUser, getUsuario, signOut, onAuthStateChange, type Usuario } from "@/data/auth";

export type { Rol, Usuario } from "@/data/auth";

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialLoadStarted = useRef(false);

  const fetchUsuario = useCallback(async (userId: string) => {
    try {
      const data = await getUsuario(userId);
      if (data) {
        setUsuario(data);
        setError(null);
      } else {
        setError("No se pudieron obtener los datos del usuario");
        setUsuario(null);
      }
    } catch (err) {
      console.error("[AuthContext] Error inesperado al obtener usuario:", err);
      setError("Error inesperado al obtener datos del usuario");
      setUsuario(null);
    }
  }, []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { user, error: authError } = await getCurrentUser();

      if (authError) {
        console.error("[AuthContext] Error de autenticación:", authError);
        setError(`Error de autenticación: ${authError}`);
        setUser(null);
        setUsuario(null);
        setLoading(false);
        return;
      }

      if (!user) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      setUser(user);
      await fetchUsuario(user.id);
    } catch (err) {
      console.error("[AuthContext] Error inesperado al cargar usuario:", err);
      setError("Error al cargar usuario");
    } finally {
      setLoading(false);
    }
  }, [fetchUsuario]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setUsuario(null);
      setError(null);
    } catch (err) {
      console.error("[AuthContext] Error al cerrar sesión:", err);
      setError("Error al cerrar sesión");
    }
  };

  useEffect(() => {
    if (isInitialLoadStarted.current) return;
    isInitialLoadStarted.current = true;

    loadUser();

    const { unsubscribe } = onAuthStateChange(async (authUser) => {
      setUser(authUser);
      if (authUser) {
        await fetchUsuario(authUser.id);
      } else {
        setUsuario(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadUser, fetchUsuario]);

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        loading,
        error,
        signOut: handleSignOut,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthUser() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthUser debe usarse dentro de un AuthProvider");
  }
  return context;
}
