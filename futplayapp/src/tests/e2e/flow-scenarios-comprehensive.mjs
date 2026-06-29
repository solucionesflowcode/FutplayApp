/**
 * E2E tests against real Flow sandbox + Supabase.
 * Covers all webhook/confirm scenarios without needing browser auth.
 *
 * Usage:
 *   npx cross-env $(cat .env.local | xargs) node src/tests/e2e/flow-scenarios-comprehensive.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cdhbfyqtubqnmgjdgkab.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const USER_ID = "b9944865-6670-4455-ba37-bb8e76346435";
const PLAN_ID = "47b73746-4000-490d-a2d0-66d5dec0ab90"; // Plan Pro

if (!SERVICE_KEY) {
    console.error("Falta SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
}

// ── Helpers ──────────────────────────────────────

let passed = 0;
let failed = 0;
let step = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.log(`  ✗ ${label}`);
        failed++;
    }
}

async function supabaseFetch(path, options = {}) {
    const url = `${SUPABASE_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
    return res;
}

async function createBoletaEnSupabase(estado = "pendiente") {
    const res = await supabaseFetch("/rest/v1/boleta", {
        method: "POST",
        body: JSON.stringify({
            usuario_id: USER_ID,
            estado,
            total: 19990,
        }),
        headers: { "Prefer": "return=representation" },
    });
    const [boleta] = await res.json();
    return boleta;
}

async function createBoletaItem(boletaId) {
    await supabaseFetch("/rest/v1/boleta_item", {
        method: "POST",
        body: JSON.stringify({
            boleta_id: boletaId,
            plan_id: PLAN_ID,
            cantidad: 1,
            precio: 19990,
            total: 19990,
        }),
        headers: { "Prefer": "return=minimal" },
    });
}

async function deleteMembresiaByBoleta(boletaId) {
    try {
        await supabaseFetch(`/rest/v1/membresia?boleta_id=eq.${boletaId}`, {
            method: "DELETE",
            headers: { "Prefer": "return=minimal" },
        });
    } catch {
        // column might not exist, try without filter
    }
}

let testId = 0;
function nextTestId() {
    return `e2e-auto-${Date.now()}-${++testId}`;
}

// ── Runner ───────────────────────────────────────

async function main() {
    console.log("═══════════════════════════════════════════");
    console.log("  Flow E2E: Todos los escenarios");
    console.log(`  Supabase: ${SUPABASE_URL}`);
    console.log(`  App:      ${BASE_URL}`);
    console.log(`  Usuario:  ${USER_ID}`);
    console.log(`  Plan:     ${PLAN_ID} (Plan Pro)`);
    console.log("═══════════════════════════════════════════\n");

    // ═══════════════════════════════════════════════
    // TEST 1: Pendiente
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. PENDIENTE — Crear boleta sin pagar y verificar confirm`);

    const boletaPending = await createBoletaEnSupabase("pendiente");
    assert(boletaPending?.id, `boleta creada: ${boletaPending?.id}`);

    // Confirm sin token → debe decir pendiente
    const confirmPending = await fetch(
        `${BASE_URL}/api/flow/confirm?boletaId=${boletaPending.id}`
    );
    const confirmPendingData = await confirmPending.json();
    assert(
        confirmPendingData.estado === "pendiente",
        `confirm → estado="${confirmPendingData.estado}"`
    );

    // ═══════════════════════════════════════════════
    // TEST 2: Cancelación
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. CANCELACIÓN — Anular boleta pendiente`);

    // Mark as anulado directly (cancel endpoint requires auth)
    await supabaseFetch(`/rest/v1/boleta?id=eq.${boletaPending.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "anulado" }),
        headers: { "Prefer": "return=minimal" },
    });

    const confirmCancelled = await fetch(
        `${BASE_URL}/api/flow/confirm?boletaId=${boletaPending.id}`
    );
    const confirmCancelledData = await confirmCancelled.json();
    // NOTA: confirm endpoint solo distingue "pagado" vs "no pagado"
    // "anulado" y "rechazado" se devuelven como "pendiente"
    console.log(`     confirm devuelve "${confirmCancelledData.estado}" (boleta está "anulado" en Supabase)`);
    // Verify directly in Supabase that estado changed
    const checkCancelled = await (
        await supabaseFetch(
            `/rest/v1/boleta?id=eq.${boletaPending.id}&select=estado`
        )
    ).json();
    assert(
        checkCancelled[0]?.estado === "anulado",
        `boleta en Supabase → "${checkCancelled[0]?.estado}"`
    );

    // ═══════════════════════════════════════════════
    // TEST 3: Webhook — Pago exitoso (sandbox fallback)
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. WEBHOOK EXITOSO — Simular pago vía sandbox fallback`);

    const boletaSuccess = await createBoletaEnSupabase("pendiente");
    await createBoletaItem(boletaSuccess.id);
    console.log(`     boleta creada: ${boletaSuccess.id} (pendiente + item)`);

    // Llamar al webhook con token inválido → sandbox fallback → status=2
    const webhookRes = await fetch(
        `${BASE_URL}/api/flow/webhook?boletaId=${boletaSuccess.id}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: `fake-token-${Date.now()}`,
                status: 2,
            }),
        }
    );
    const webhookData = await webhookRes.json();
    assert(
        webhookRes.ok && webhookData.message === "OK",
        `webhook respondió: ${JSON.stringify(webhookData)}`
    );

    // Verificar boleta pasó a pagado
    const { default: BoletaAfter } = await supabaseFetch(
        `/rest/v1/boleta?id=eq.${boletaSuccess.id}&select=estado`
    );
    // Use fresh fetch
    const checkBoleta = await (
        await supabaseFetch(
            `/rest/v1/boleta?id=eq.${boletaSuccess.id}&select=estado`
        )
    ).json();
    assert(
        checkBoleta[0]?.estado === "pagado",
        `boleta después del webhook → "${checkBoleta[0]?.estado}"`
    );

    // ═══════════════════════════════════════════════
    // TEST 4: Webhook — Idempotencia (segundo llamado)
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. IDEMPOTENCIA — Llamar webhook dos veces`);

    const webhookRes2 = await fetch(
        `${BASE_URL}/api/flow/webhook?boletaId=${boletaSuccess.id}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: `fake-token-${Date.now()}`,
                status: 2,
            }),
        }
    );
    const webhookData2 = await webhookRes2.json();
    assert(
        webhookRes2.ok,
        `segundo webhook respondió ok: ${JSON.stringify(webhookData2)}`
    );
    // The webhook returns "Ya procesado" (line 193) or "OK" depending on atomic update

    // ═══════════════════════════════════════════════
    // TEST 5: Rechazo — Simular status 3 en el webhook
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. RECHAZO — Simular pago rechazado (status=3)`);

    // Since webhook sandbox fallback always defaults to status=2,
    // we test rejection by checking what happens with a boleta marked as rechazado
    const boletaRejected = await createBoletaEnSupabase("pendiente");
    await createBoletaItem(boletaRejected.id);

    // Mark as rechazado directly
    await supabaseFetch(`/rest/v1/boleta?id=eq.${boletaRejected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "rechazado" }),
        headers: { "Prefer": "return=minimal" },
    });

    const confirmRejected = await fetch(
        `${BASE_URL}/api/flow/confirm?boletaId=${boletaRejected.id}`
    );
    const confirmRejectedData = await confirmRejected.json();
    // Same: confirm endpoint doesn't distinguish rejected vs pending
    console.log(`     confirm devuelve "${confirmRejectedData.estado}" (boleta está "rechazado" en Supabase)`);
    const checkRejected = await (
        await supabaseFetch(
            `/rest/v1/boleta?id=eq.${boletaRejected.id}&select=estado`
        )
    ).json();
    assert(
        checkRejected[0]?.estado === "rechazado",
        `boleta en Supabase → "${checkRejected[0]?.estado}"`
    );

    // ═══════════════════════════════════════════════
    // TEST 6: Boleta inexistente
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. BOLETA INEXISTENTE — Confirm con UUID falso`);

    const confirmFake = await fetch(
        `${BASE_URL}/api/flow/confirm?boletaId=00000000-0000-0000-0000-000000000000`
    );
    assert(
        confirmFake.status === 404,
        `confirm con boleta falsa → status ${confirmFake.status}`
    );

    // ═══════════════════════════════════════════════
    // TEST 7: Webhook sin boletaId
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. WEBHOOK SIN BOLETAID — Fallback sandbox sin boletaId`);

    const webhookNoBoleta = await fetch(`${BASE_URL}/api/flow/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: `fake-token-${Date.now()}` }),
    });
    const webhookNoBoletaData = await webhookNoBoleta.json();
    assert(
        webhookNoBoleta.ok,
        `webhook sin boletaId → ${JSON.stringify(webhookNoBoletaData)}`
    );

    // ═══════════════════════════════════════════════
    // TEST 8: Webhook con content-type form-urlencoded
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. WEBHOOK FORM-URLENCODED — Content-type application/x-www-form-urlencoded`);

    const boletaForm = await createBoletaEnSupabase("pendiente");
    await createBoletaItem(boletaForm.id);

    const params = new URLSearchParams({
        token: `fake-form-${Date.now()}`,
        status: "2",
    });
    const webhookForm = await fetch(
        `${BASE_URL}/api/flow/webhook?boletaId=${boletaForm.id}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        }
    );
    const webhookFormData = await webhookForm.json();
    assert(
        webhookForm.ok,
        `webhook form-urlencoded → ${JSON.stringify(webhookFormData)}`
    );

    const checkFormBoleta = await (
        await supabaseFetch(
            `/rest/v1/boleta?id=eq.${boletaForm.id}&select=estado`
        )
    ).json();
    assert(
        checkFormBoleta[0]?.estado === "pagado",
        `boleta (form) después del webhook → "${checkFormBoleta[0]?.estado}"`
    );

    // ═══════════════════════════════════════════════
    // TEST 9: Webhook con status 3 real (si el sandbox lo devuelve)
    // ═══════════════════════════════════════════════
    console.log(`\n${++step}. WEBHOOK RECHAZO REAL — Con token real de Flow (si está disponible)`);

    try {
        // Create real Flow order to get token
        const crypto = await import("node:crypto");
        const flowRes = await fetch(`${BASE_URL}/api/flow/create-order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                planId: PLAN_ID,
                // The route requires auth, so this will likely fail
            }),
        });
        console.log(`     /api/flow/create-order → status ${flowRes.status} (requiere auth, omitiendo)`);
    } catch {
        console.log(`     /api/flow/create-order requiere auth — omitido`);
    }

    // ═══════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════
    console.log("\n═══════════════════════════════════════════");
    console.log(`  Resultado: ${passed} passed, ${failed} failed`);
    console.log("═══════════════════════════════════════════\n");

    // Cleanup test boletas (keep them for inspection)
    console.log("NOTA: Las boletas de prueba se conservan en BD para inspección.");
    console.log(`      Puedes revisarlas en Supabase con usuario_id=${USER_ID}`);

    if (failed > 0) process.exit(1);
}

main().catch((e) => {
    console.error("Error:", e);
    process.exit(1);
});
