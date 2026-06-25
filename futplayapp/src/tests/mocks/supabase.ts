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
    function getResponse(): Promise<MockResponse & { count?: number }> {
        const r = state.tables[table];
        if (!r) return Promise.resolve({ data: null, error: null, count: 0 });
        const count = Array.isArray(r.data) ? r.data.length : (r.data !== null && r.data !== undefined ? 1 : 0);
        return Promise.resolve({ ...r, count });
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
        single: vi.fn(() => getResponse().then((r) => {
            if (Array.isArray(r.data)) {
                return { data: r.data[0] ?? null, error: r.error, count: r.count };
            }
            return r;
        })),
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
            admin: {
                createUser: vi.fn(() => Promise.resolve({ data: { user: { id: "new-auth-id" } }, error: null })),
                deleteUser: vi.fn(() => Promise.resolve({ error: null })),
                listUsers: vi.fn(() => Promise.resolve({ data: { users: [] }, error: null })),
            },
        },
        from: vi.fn((table: string) => makeChain(table)),
        rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
        storage: {
            getBucket: vi.fn(() => Promise.resolve({ error: null })),
            createBucket: vi.fn(() => Promise.resolve({ error: null })),
            from: vi.fn(() => ({
                upload: vi.fn(() => Promise.resolve({ error: null })),
                getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/test/file.jpg" } })),
            })),
        },
    };
}
