import "./globals.css";
import { AuthProvider } from "@/context";

/**
 * Layout raíz de la aplicación.
 * Envuelve toda la app con el AuthProvider para tener acceso
 * al contexto de autenticación en cualquier lugar.
 */
export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
