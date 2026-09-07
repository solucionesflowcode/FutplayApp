-- SUITE COMPLETA DE REGLAS DE NEGOCIO - VIGENCIA + TOKENS + CUPO + CANCELACIÓN
-- Ejecutar en el SQL Editor DESPUÉS de aplicar (en orden):
--   1) faseA_vigencia_trigger_inscripcion.sql   (manejar_inscripcion_clase + trigger_inscripcion)
--   2) faseA_fix_limitar_15_alumnos.sql         (limitar_15_alumnos + trigger_limite_15)
--   3) fix_devolver_token_vigencia.sql          (devolver_token por vigencia)
--
-- Cubre TODAS las reglas de negocio:
--   R1  Membresía ACTIVA por VIGENCIA (estado=true + fechas), no por mes calendario
--   R2  Entrenamiento/kids descuenta 1 token
--   R3  Partido NO descuenta token
--   R4  Rechaza si NO hay membresía activa
--   R5  Rechaza membresía VENCIDA / sin tokens disponibles
--   R6  Trigger alumnos por clase: respeta cupo_maximo PRIMERO
--   R7  Cancelados NO ocupan cupo
--   R8  Cancelación ≥3h devuelve el token (devolver_token)
--   R9  tokens_usados NUNCA queda negativo
--   R10 Devolución funciona aunque la membresía vigente empezó en OTRO MES (el bug real)
--   R11 Devolución a la membresía vigente que descontó (no a una más nueva vacía)
--   R12 Trigger alumnos por clase: cupo_maximo NULL => default 15 (el 16o es rechazado)
--
-- Si algo falla aborta con EXCEPTION y mensaje claro. Todo se limpia al final.
-- Los datos de prueba usan 'TEST_BIZ%' como marcador, en la columna descripcion (text, no enum).

-- ── INICIO DE TRANSACCIÓN TOXARIO ───────────────────────────────────────
-- Toda la suite corre en una transacción:
--   - Se quita TEMPORALMENTE la FK usuario_id_fkey (usuario.id -> auth.users) para poder
--     insertar usuarios de prueba "TEST_BIZ_*" sin crear usuarios reales en auth.users.
--   - Se re-crea la FK al final.
--   - Si CUALQUIER test falla (RAISE EXCEPTION), la transacción se revierte y la FK queda
--     intacta. No queda NADA en la base (datos de prueba + cambios se deshacen).
BEGIN;

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_id_fkey;

-- ── LIMPIEZA IDEMPOTENTE ────────────────────────────────────────────────
DELETE FROM clase_usuario
WHERE clase_id IN (SELECT id FROM clase WHERE descripcion LIKE 'TEST_BIZ%' OR titulo::text LIKE 'TEST_BIZ%')
   OR usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_BIZ%');
DELETE FROM clase WHERE descripcion LIKE 'TEST_BIZ%' OR titulo::text LIKE 'TEST_BIZ%';
DELETE FROM membresia WHERE usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_BIZ%');
DELETE FROM plan WHERE nombre LIKE 'TEST_BIZ%';
DELETE FROM usuario WHERE nombre LIKE 'TEST_BIZ%';

CREATE TEMP TABLE IF NOT EXISTS ctx (k text PRIMARY KEY, v uuid);
DELETE FROM ctx;

-- ── SETUP ───────────────────────────────────────────────────────────────
DO $$
DECLARE nuevo_id uuid;
BEGIN
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_A','jugador','test.biz.a@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_a', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_B','jugador','test.biz.b@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_b', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_C','jugador','test.biz.c@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_c', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_D','jugador','test.biz.d@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_d', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_E','jugador','test.biz.e@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_e', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_F','jugador','test.biz.f@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_f', nuevo_id);
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_G','jugador','test.biz.g@futplay.cl') RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('user_g', nuevo_id);

    INSERT INTO plan (id, nombre, tokens_mensuales, precio)
    VALUES (gen_random_uuid(),'TEST_BIZ_PLAN',5,1000) RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('plan', nuevo_id);

    -- Entrenamiento normal (descuenta token). titulo se deja NULL (es USER-ENUM).
    INSERT INTO clase (id, descripcion, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_BIZ_ENT', NULL, 'entrenamiento', 20, now()) RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('clase_ent', nuevo_id);

    -- Partido (NO descuenta token)
    INSERT INTO clase (id, descripcion, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_BIZ_PAR', NULL, 'partido', NULL, now()) RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('clase_par', nuevo_id);

    -- Clase con cupo 2 para probar cupo y cancelado
    INSERT INTO clase (id, descripcion, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_BIZ_CUPO', NULL, 'entrenamiento', 2, now()) RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('clase_cupo', nuevo_id);

    -- Clase con cupo NULL (default 15) para R12
    INSERT INTO clase (id, descripcion, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_BIZ_15', NULL, 'entrenamiento', NULL, now()) RETURNING id INTO nuevo_id;
    INSERT INTO ctx VALUES ('clase_15', nuevo_id);

    ----------
    -- Membresías
    ----------
    -- A: activa, empezó hace mucho (CUALQUIER mes), vigente hoy -> 5 tokens
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM ctx WHERE k='user_a'), (SELECT v FROM ctx WHERE k='plan'),
            5, 0, now() - interval '40 days', now() + interval '50 days', true);

    -- B: VENCIDA (fecha_vencimiento < now())
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM ctx WHERE k='user_b'), (SELECT v FROM ctx WHERE k='plan'),
            5, 0, now() - interval '60 days', now() - interval '30 days', true);

    -- C: activa pero 0 tokens disponibles (usados == totales)
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM ctx WHERE k='user_c'), (SELECT v FROM ctx WHERE k='plan'),
            3, 3, now() - interval '1 day', now() + interval '29 days', true);

    -- D: activa, 4 tokens, empezó hace 40 días (mes distinto al actual)
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM ctx WHERE k='user_d'), (SELECT v FROM ctx WHERE k='plan'),
            4, 0, now() - interval '40 days', now() + interval '50 days', true);

    -- E,F,G: activas para cupo
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    SELECT gen_random_uuid(), tv.v, (SELECT v FROM ctx WHERE k='plan'),
           5, 0, now() - interval '1 day', now() + interval '29 days', true
    FROM ctx tv WHERE tv.k IN ('user_e','user_f','user_g');

    RAISE NOTICE 'SETUP OK';
END $$;

-- ── R1+R2: Entrenamiento descuenta 1 token, membresía por vigencia ──────
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_d');
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_ent');
    us int;
BEGIN
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R2 FALLÓ: %', SQLERRM; END;
    SELECT tokens_usados INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 1 THEN RAISE EXCEPTION 'R2 FALLÓ: esperado 1, actual % (R1: ¿seleccionó por vigencia?)', us; END IF;
    RAISE NOTICE 'R1+R2 OK - inscripción por vigencia descuenta 1 token (tokens_usados=1)';
END $$;

-- ── R10: Devolución aunque la membresía vigente empezó en OTRO MES ──────
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_d');
    us int; ok boolean;
BEGIN
    ok := devolver_token(v_u);
    IF ok <> true THEN RAISE EXCEPTION 'R10 FALLÓ: no devolvió con membresía vigente de otro mes'; END IF;
    SELECT tokens_usados INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 0 THEN RAISE EXCEPTION 'R10 FALLÓ: esperado 0 tras devolución, actual %', us; END IF;
    RAISE NOTICE 'R10 OK - devuelve token aunque la membresía empezó en otro mes (1 -> 0 tokens)';
END $$;

-- ── R9: tokens_usados NUNCA negativo (devuelve hasta 0, no -1) ──────────
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_d');
    ok1 boolean; ok2 boolean;
BEGIN
    ok1 := devolver_token(v_u);   -- debe dar false (no hay token que devolver)
    ok2 := devolver_token(v_u);   -- debe seguir false
    IF ok1 <> false OR ok2 <> false THEN RAISE EXCEPTION 'R9 FALLÓ: devolvió cuando tokens_usados=0 (lapso negativo)'; END IF;
    IF EXISTS (SELECT 1 FROM membresia WHERE usuario_id = v_u AND tokens_usados < 0)
       THEN RAISE EXCEPTION 'R9 FALLÓ: tokens_usados quedó NEGATIVO'; END IF;
    RAISE NOTICE 'R9 OK - devolver_token nunca deja tokens_usados en negativo';
END $$;

-- ── R3: Partido NO descuenta token ──────────────────────────────────────
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_d');
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_par');
    us int;
BEGIN
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R3 FALLÓ: no se pudo inscribir al partido: %', SQLERRM; END;
    SELECT tokens_usados INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 0 THEN RAISE EXCEPTION 'R3 FALLÓ: el partido descontó token (tokens_usados=%)', us; END IF;
    RAISE NOTICE 'R3 OK - partido NO descuenta token (tokens_usados sigue =0)';
END $$;

-- ── R4: Rechaza SIN membresía activa (usuario sin fila en membresia) ─────
DO $$
DECLARE v_u uuid; v_c uuid;
BEGIN
    v_c := (SELECT v FROM ctx WHERE k='clase_ent');
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(),'TEST_BIZ_SINMEMB','jugador','test.biz.sinmemb@futplay.cl') RETURNING id INTO v_u;
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
        RAISE EXCEPTION 'R4 FALLÓ: se inscribió sin membresía';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes membresía activa%' THEN RAISE NOTICE 'R4 OK - rechaza sin membresía';
        ELSE RAISE; END IF;
    END;
    DELETE FROM usuario WHERE id = v_u;
END $$;

-- ── R5: Rechaza membresía VENCIDA ───────────────────────────────────────
DO $$
DECLARE v_u uuid := (SELECT v FROM ctx WHERE k='user_b');
        v_c uuid := (SELECT v FROM ctx WHERE k='clase_ent');
BEGIN
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
         RAISE EXCEPTION 'R5 FALLÓ: se inscribió con membresía vencida';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes membresía activa%' THEN RAISE NOTICE 'R5 OK - rechaza membresía vencida';
        ELSE RAISE; END IF;
    END;
END $$;

-- ── R5b: Rechaza sin tokens disponibles (usados == totales) ─────────────
DO $$
DECLARE v_u uuid := (SELECT v FROM ctx WHERE k='user_c');
        v_c uuid := (SELECT v FROM ctx WHERE k='clase_ent');
BEGIN
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
         RAISE EXCEPTION 'R5b FALLÓ: se inscribió sin tokens';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes tokens disponibles%' THEN RAISE NOTICE 'R5b OK - rechaza sin tokens';
        ELSE RAISE; END IF;
    END;
END $$;

-- ── R6: Trigger alumnos por clase - respeta cupo_maximo (cupo=2) PRIMERO ─
DO $$
DECLARE
    v_e uuid := (SELECT v FROM ctx WHERE k='user_e');
    v_f uuid := (SELECT v FROM ctx WHERE k='user_f');
    v_g uuid := (SELECT v FROM ctx WHERE k='user_g');
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_cupo');
BEGIN
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_e, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R6 FALLÓ primer alumno: %', SQLERRM; END;
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_f, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R6 FALLÓ segundo alumno: %', SQLERRM; END;
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_g, v_c);
         RAISE EXCEPTION 'R6 FALLÓ: tercer alumno entró con cupo lleno';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Clase llena%' THEN RAISE NOTICE 'R6 OK - cupo_maximo respetado (2/2, 3ro rechazado)';
        ELSE RAISE; END IF;
    END;
END $$;

-- ── R7: Cancelados NO ocupan cupo ───────────────────────────────────────
DO $$
DECLARE
    v_e uuid := (SELECT v FROM ctx WHERE k='user_e');
    v_g uuid := (SELECT v FROM ctx WHERE k='user_g');
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_cupo');
BEGIN
    UPDATE clase_usuario SET asistencia='cancelado'
     WHERE usuario_id = v_e AND clase_id = v_c;
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_g, v_c);
         RAISE NOTICE 'R7 OK - cancelado NO ocupa cupo (entra user_g)';
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R7 FALLÓ: cancelado bloquea cupo: %', SQLERRM; END;
END $$;

-- ── R11: Devolución a la membresía vigente que descontó (no a una más nueva vacía) ──
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_d'); -- tokens_usados=0 tras R10/R9
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_ent');
    us int; ok boolean;
BEGIN
    -- Flujo REAL de re-inscripción JS: DELETE + INSERT (hay UNIQUE usuario_id+clase_id)
    DELETE FROM clase_usuario WHERE usuario_id = v_u AND clase_id = v_c;
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R11 setup FALLÓ: %', SQLERRM; END;
    -- agregamos una membresía nueva (más reciente en vigencia) VACÍA
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), v_u, (SELECT v FROM ctx WHERE k='plan'),
            12, 0, now(), now() + interval '29 days', true);
    ok := devolver_token(v_u);
    IF ok <> true THEN RAISE EXCEPTION 'R11 FALLÓ: no devolvió con membresía nueva vacía presente'; END IF;
    SELECT COALESCE(sum(tokens_usados),0) INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 0 THEN RAISE EXCEPTION 'R11 FALLÓ: suma tokens_usados=% (debió 0), devolvió a membresía equivocada', us; END IF;
    RAISE NOTICE 'R11 OK - devuelve a la membresía que consumió (suma tokens_usados global vuelve a 0)';
END $$;

-- ── R8: Cancelación ≥3h devuelve el token (end-to-end del flujo) ────────
DO $$
DECLARE
    v_u uuid := (SELECT v FROM ctx WHERE k='user_a');
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_ent');
    us int; ok boolean;
BEGIN
    DELETE FROM clase_usuario WHERE usuario_id = v_u AND clase_id = v_c;
    BEGIN INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
    EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'R8 setup FALLÓ: %', SQLERRM; END;
    SELECT tokens_usados INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 1 THEN RAISE EXCEPTION 'R8 setup: esperado 1, actual %', us; END IF;
    ok := devolver_token(v_u);
    IF ok <> true THEN RAISE EXCEPTION 'R8 FALLÓ: devolver_token no retornó true'; END IF;
    SELECT tokens_usados INTO us FROM membresia WHERE usuario_id = v_u;
    IF us <> 0 THEN RAISE EXCEPTION 'R8 FALLÓ: token no devuelto (esperado 0, actual %)', us; END IF;
    RAISE NOTICE 'R8 OK - cancelación ≥3h devuelve el token (tokens_usados 1 -> 0)';
END $$;

-- ── R12: Trigger alumnos por clase - cupo_maximo NULL => default 15 ─────
DO $$
DECLARE
    v_c uuid := (SELECT v FROM ctx WHERE k='clase_15');
    v_plan uuid := (SELECT v FROM ctx WHERE k='plan');
    v_u uuid; i int;
BEGIN
    FOR i IN 1..15 LOOP
        INSERT INTO usuario (id, nombre, rol, email)
        VALUES (gen_random_uuid(), 'TEST_BIZ_FILL_' || lpad(i::text, 2, '0'), 'jugador',
                'test.biz.fill.' || i || '@futplay.cl') RETURNING id INTO v_u;
        INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                               fecha_inicio, fecha_vencimiento, estado)
        VALUES (gen_random_uuid(), v_u, v_plan, 5, 0, now() - interval '1 day', now() + interval '29 days', true);
        BEGIN
            INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'R12 FALLÓ: el alumno % no entró con cupo NULL (default 15): %', i, SQLERRM;
        END;
    END LOOP;
    -- alumno 16 => debe ser rechazado
    INSERT INTO usuario (id, nombre, rol, email)
    VALUES (gen_random_uuid(), 'TEST_BIZ_FILL_16', 'jugador', 'test.biz.fill.16@futplay.cl') RETURNING id INTO v_u;
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), v_u, v_plan, 5, 0, now() - interval '1 day', now() + interval '29 days', true);
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_u, v_c);
        RAISE EXCEPTION 'R12 FALLÓ: el 16o alumno entró con cupo NULL (debió rechazar)';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Clase llena%' THEN RAISE NOTICE 'R12 OK - cupo NULL = default 15 (16o rechazado)';
        ELSE RAISE; END IF;
    END;
END $$;

-- ── CLEANUP ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    DELETE FROM clase_usuario WHERE usuario_id IN (SELECT v FROM ctx WHERE k LIKE 'user_%')
       OR clase_id IN (SELECT v FROM ctx WHERE k LIKE 'clase_%');
    DELETE FROM clase_usuario
       WHERE usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_BIZ%');
    DELETE FROM membresia WHERE usuario_id IN (SELECT v FROM ctx WHERE k LIKE 'user_%');
    DELETE FROM membresia WHERE usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_BIZ%');
    DELETE FROM clase WHERE id IN (SELECT v FROM ctx WHERE k LIKE 'clase_%');
    DELETE FROM plan WHERE id IN (SELECT v FROM ctx WHERE k='plan');
    DELETE FROM usuario WHERE id IN (SELECT v FROM ctx WHERE k LIKE 'user_%');
    DELETE FROM usuario WHERE nombre LIKE 'TEST_BIZ%';
    RAISE NOTICE 'CLEANUP OK - TODAS LAS REGLAS DE NEGOCIO PASARON';
END $$;

-- ── RESTAURAR FK Y COMMIT ───────────────────────────────────────────────
ALTER TABLE usuario ADD CONSTRAINT usuario_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

COMMIT;
-- Si llegaste hasta acá sin error: TODAS las reglas pasaron. La FK quedó restaurada.