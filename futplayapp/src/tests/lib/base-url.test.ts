import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { getBaseUrl } from "@/lib/base-url";

beforeAll(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
});

afterAll(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
});

function makeRequest(host: string): Request {
    return new Request(`https://${host}/api/planes/familiar?token=abc`);
}

describe("getBaseUrl", () => {
    it("usa NEXT_PUBLIC_BASE_URL si está configurada y no es vercel.app", () => {
        process.env.NEXT_PUBLIC_BASE_URL = "https://futplay.cl";
        expect(getBaseUrl(makeRequest("futplay-vercel.vercel.app"))).toBe("https://futplay.cl");
    });

    it("ignora NEXT_PUBLIC_BASE_URL de tipo .vercel.app y usa el origen de la request", () => {
        process.env.NEXT_PUBLIC_BASE_URL = "https://futplay-vercel.vercel.app";
        expect(getBaseUrl(makeRequest("futplay.cl"))).toBe("https://futplay.cl");
    });

    it("ignora NEXT_PUBLIC_BASE_URL de localhost y usa el origen de la request", () => {
        process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
        expect(getBaseUrl(makeRequest("localhost:3000"))).toBe("https://localhost:3000");
    });

    it("usa el origen de la request si no hay env var", () => {
        delete process.env.NEXT_PUBLIC_BASE_URL;
        expect(getBaseUrl(makeRequest("futplay.cl"))).toBe("https://futplay.cl");
    });
});