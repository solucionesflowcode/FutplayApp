import { defineConfig } from "vitest/config";
import path from "path";
import fs from "fs";

// ── Cargar .env.local para que las credenciales de Flow estén disponibles en E2E ──
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const eqIdx = trimmed.indexOf("=");
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./src/tests/setup.ts"],
        globals: true,
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
