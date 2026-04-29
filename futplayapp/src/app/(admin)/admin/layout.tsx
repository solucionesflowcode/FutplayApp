import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="position: fixed; flex min-h-screen bg-[#F8F9FB]">
      {/* El Sidebar se queda aquí fijo para TODAS las páginas de admin */}
      <Sidebar />

      {/* El "children" es el contenido de tu page.tsx (la tabla, los stats, etc.) */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}