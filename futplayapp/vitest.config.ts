import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        setupFiles: ["./src/__tests__/setup.ts"],
        globals: true,
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
