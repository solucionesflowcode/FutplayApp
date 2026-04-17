/**
 * Context de Autenticación con Supabase
 * 
 * Proporciona estado global para gestionar la autenticación de usuarios
 * y sus roles en la aplicación FutPlay.
 * 
 * @module context
 * 
 * @example
 * // En layout.tsx - importar AuthProvider
 * import { AuthProvider } from "@/context";
 * 
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   );
 * }
 * 
 * @example
 * // Uso del hook useAuthUser()
 * import { useAuthUser } from "@/context";
 * 
 * function Profile() {
 *   const { user, usuario, loading, error, signOut, refreshUser } = useAuthUser();
 *   
 *   if (loading) return <p>Cargando...</p>;
 *   
 *   return (
 *     <div>
 *       <p>Email: {user?.email}</p>
 *       <p>Nombre: {usuario?.nombre}</p>
 *       <p>Rol: {usuario?.rol}</p>
 *       <button onClick={signOut}>Cerrar sesión</button>
 *     </div>
 *   );
 * }
 * 
 * @example
 * // Renderizado por rol
 * import { useAuthUser } from "@/context";
 * 
 * function Dashboard() {
 *   const { usuario } = useAuthUser();
 *   
 *   switch (usuario?.rol) {
 *     case "administrador":
 *       return <AdminPanel />;
 *     case "profesor":
 *       return <ProfesorPanel />;
 *     case "jugador":
 *       return <JugadorPanel />;
 *     default:
 *       return <p>Rol no reconocido</p>;
 *   }
 * }
 * 
 * @example
 * // Proteger rutas con AuthGuard
 * import { AuthGuard } from "@/context";
 * 
 * function App() {
 *   return (
 *     <AuthGuard allowedRoles={["administrador"]}>
 *       <PanelAdmin />
 *     </AuthGuard>
 *   );
 * }
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

// Exports del contexto de autenticación
export { AuthProvider, useAuthUser } from "./AuthContext";
export type { Rol, Usuario } from "./AuthContext";

// Export del componente para proteger rutas
export { AuthGuard } from "./AuthGuard";
