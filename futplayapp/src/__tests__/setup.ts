import "@testing-library/jest-dom";

// Silence console logs during tests unless explicitly testing logging
globalThis.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};
