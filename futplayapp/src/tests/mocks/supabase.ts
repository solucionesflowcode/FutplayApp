import { vi } from "vitest";

// ── Shared mutable state (reset between tests) ──────────────

type MockResponse = { data: any; error: any };

const state: {
    authUser: any;
    tables: Record<string, MockResponse>;
} = {
    authUser: null,
    tables: {},
};

// ── Test helpers ────────────────────────────────────────────

export function __resetMocks() {
    state.authUser = null;
    state.tables = {};
}

export function __setAuthUser(user: any) {
    state.authUser = user;
}

export function __setTableData(table: string, data: any, error: any = null) {
    state.tables[table] = { data, error };
}

// ── Chain builder ───────────────────────────────────────────

/**
 * Creates a thenable terminal for a given table.
 *
 * Each method returns the terminal itself (for chaining).
 * Awaiting the terminal resolves with the table's configured MockResponse.
 * `.single()` / `.maybeSingle()` are explicit terminals that return a Promise.
 */
function makeChain(table: string) {
    function getResponse(): Promise<MockResponse> {
        const r = state.tables[table];
        if (!r) return Promise.reject(new Error(`No mock data for table "${table}"`));
        return Promise.resolve(r);
    }

    const terminal: any = {
        // Thenable: makes `await chain` resolve with MockResponse
        then(resolve: (v: MockResponse) => void, reject?: (e: Error) => void) {
            return getResponse().then(resolve, reject);
        },

        // Chainable methods (return terminal for continued chaining)
        select: vi.fn(() => terminal),
        insert: vi.fn(() => terminal),
        update: vi.fn(() => terminal),
        delete: vi.fn(() => terminal),
        eq: vi.fn(() => terminal),
        neq: vi.fn(() => terminal),
        gt: vi.fn(() => terminal),
        gte: vi.fn(() => terminal),
        lt: vi.fn(() => terminal),
        lte: vi.fn(() => terminal),
        in: vi.fn(() => terminal),
        order: vi.fn(() => terminal),
        limit: vi.fn(() => terminal),

        // Terminal methods (return Promise directly)
        single: vi.fn(() => getResponse()),
        maybeSingle: vi.fn(() => {
            const r = state.tables[table];
            if (!r || r.data === undefined) return Promise.resolve({ data: null, error: null });
            return Promise.resolve(r);
        }),
    };

    return terminal;
}

// ── Factory ─────────────────────────────────────────────────

export function createMockServerClient() {
    return {
        auth: {
            getUser: vi.fn(() =>
                Promise.resolve({ data: { user: state.authUser } }),
            ),
        },
        from: vi.fn((table: string) => makeChain(table)),
    };
}
