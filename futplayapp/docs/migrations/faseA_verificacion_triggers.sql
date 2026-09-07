-- FASE A/B - Verificación de triggers post-despliegue
-- Ejecutar en el SQL Editor DESPUÉS de aplicar los 3 migrations de Fase A y B.
-- Crea datos de prueba "TEST_AUDIT_*", valida el comportamiento de los triggers
-- y borra todo al final. Si un test falla, aborta con EXCEPTION (ver mensaje).
--
-- Tests:
--   T1  Entrenamiento descuenta 1 token (tokens_usados 0 -> 1)
--   T2  Partido NO descuenta token
--   T3  Rechaza inscripción SIN membresía
--   T4  Rechaza inscripción con membresía VENCIDA
--   T5  Rechaza inscripción sin tokens disponibles
--   T6  Cupo respeta cupo_maximo (Clase llena)
--   T7  Cancelados NO ocupan cupo (regresión bug 0/18)
--   T8  Re-inscripción (delete + insert del flujo JS) descuenta token
--
-- Limpieza idempotente de intentos anteriores (por patrón de nombre)
DELETE FROM clase_usuario
WHERE clase_id IN (SELECT id FROM clase WHERE titulo LIKE 'TEST_AUDIT%')
   OR usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_AUDIT%');
DELETE FROM clase WHERE titulo LIKE 'TEST_AUDIT%';
DELETE FROM membresia WHERE usuario_id IN (SELECT id FROM usuario WHERE nombre LIKE 'TEST_AUDIT%');
DELETE FROM plan WHERE nombre LIKE 'TEST_AUDIT%';
DELETE FROM usuario WHERE nombre LIKE 'TEST_AUDIT%';

CREATE TEMP TABLE IF NOT EXISTS test_ctx (k text PRIMARY KEY, v uuid);

-- ── SETUP ──────────────────────────────────────────────────────────────
DO $$
DECLARE
    v uuid;
BEGIN
    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_A', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_a', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_B', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_b', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_C', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_c', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_D', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_d', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_E', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_e', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_F', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_f', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_G', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_g', v);

    INSERT INTO usuario (id, nombre, rol)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_USER_H', 'jugador') RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('user_h', v);

    -- Plan de prueba
    INSERT INTO plan (id, nombre, tokens_mensuales, precio)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_PLAN', 5, 1000) RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('plan', v);

    -- Clases de prueba
    INSERT INTO clase (id, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_ENTRENAMIENTO', 'entrenamiento', 20, now()) RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('clase_tokens', v);

    INSERT INTO clase (id, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_PARTIDO', 'partido', NULL, now()) RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('clase_part', v);

    INSERT INTO clase (id, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_CUPO', 'entrenamiento', 2, now()) RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('clase_cupo', v);

    INSERT INTO clase (id, titulo, tipo_evento, cupo_maximo, fecha_hora)
    VALUES (gen_random_uuid(), 'TEST_AUDIT_MEMBRESIA', 'entrenamiento', 20, now()) RETURNING id INTO v;
    INSERT INTO test_ctx VALUES ('clase_memb', v);

    -- Membresías (estado, fecha_inicio, fecha_vencimiento, tokens)
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM test_ctx WHERE k='user_a'), (SELECT v FROM test_ctx WHERE k='plan'),
            5, 0, now() - interval '1 day', now() + interval '29 days', true);

    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM test_ctx WHERE k='user_b'), (SELECT v FROM test_ctx WHERE k='plan'),
            5, 0, now() - interval '2 days', now() - interval '1 day', true);

    -- user_d: membresía activa pero con TODOS los tokens usados
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    VALUES (gen_random_uuid(), (SELECT v FROM test_ctx WHERE k='user_d'), (SELECT v FROM test_ctx WHERE k='plan'),
            3, 3, now() - interval '1 day', now() + interval '29 days', true);

    -- Users para cupo (E, F, G, H) con membresía activa
    INSERT INTO membresia (id, usuario_id, plan_id, tokens_totales, tokens_usados,
                           fecha_inicio, fecha_vencimiento, estado)
    SELECT gen_random_uuid(), tv.v, (SELECT v FROM test_ctx WHERE k='plan'),
           5, 0, now() - interval '1 day', now() + interval '29 days', true
    FROM test_ctx tv
    WHERE tv.k IN ('user_e','user_f','user_g','user_h')
      AND tv.v NOT IN (SELECT usuario_id FROM membresia WHERE usuario_id = tv.v);
    RAISE NOTICE 'SETUP OK - datos de prueba creados';
END $$;

-- ── T1: Entrenamiento descuenta 1 token ────────────────────────────────
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_a');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_tokens');
    v_ins     uuid;
    usados    int;
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase) RETURNING id INTO v_ins;
        INSERT INTO test_ctx VALUES ('ins_a1', v_ins);
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T1 FALLÓ - inscripción con membresía activa y tokens: %', SQLERRM;
    END;

    SELECT tokens_usados INTO usados FROM membresia WHERE usuario_id = v_usuario;
    IF usados <> 1 THEN
        RAISE EXCEPTION 'T1 FALLÓ - token no descontado (esperado 1, actual %)', usados;
    END IF;
    RAISE NOTICE 'T1 OK - entrenamiento descuenta token (tokens_usados=1)';
END $$;

-- ── T2: Partido NO descuenta token ─────────────────────────────────────
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_a');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_part');
    v_ins     uuid;
    usados    int;
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase) RETURNING id INTO v_ins;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T2 FALLÓ - no se pudo inscribir al partido: %', SQLERRM;
    END;

    SELECT tokens_usados INTO usados FROM membresia WHERE usuario_id = v_usuario;
    IF usados <> 1 THEN
        RAISE EXCEPTION 'T2 FALLÓ - el partido descontó token (tokens_usados=%)', usados;
    END IF;
    RAISE NOTICE 'T2 OK - partido NO descuenta token (tokens_usados sigue =1)';
END $$;

-- ── T3: Rechaza SIN membresía ──────────────────────────────────────────
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_c');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_memb');
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase);
        RAISE EXCEPTION 'T3 FALLÓ - se insertó sin membresía';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes membresía activa%' THEN
            RAISE NOTICE 'T3 OK - rechaza sin membresía';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- ── T4: Rechaza membresía VENCIDA ──────────────────────────────────────
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_b');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_memb');
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase);
        RAISE EXCEPTION 'T4 FALLÓ - se insertó con membresía vencida';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes membresía activa%' THEN
            RAISE NOTICE 'T4 OK - rechaza membresía vencida';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- ── T5: Rechaza sin tokens disponibles ─────────────────────────────────
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_d');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_tokens');
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase);
        RAISE EXCEPTION 'T5 FALLÓ - se insertó sin tokens disponibles';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%No tienes tokens disponibles%' THEN
            RAISE NOTICE 'T5 OK - rechaza sin tokens disponibles';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- ── T6: Cupo respeta cupo_maximo (clase_cupo cupo=2) ───────────────────
DO $$
DECLARE
    v_e uuid := (SELECT v FROM test_ctx WHERE k='user_e');
    v_f uuid := (SELECT v FROM test_ctx WHERE k='user_f');
    v_g uuid := (SELECT v FROM test_ctx WHERE k='user_g');
    v_clase uuid := (SELECT v FROM test_ctx WHERE k='clase_cupo');
BEGIN
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_e, v_clase);
        RAISE NOTICE 'T6 OK parte 1 - primer alumno ocupa cupo 1/2';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T6 FALLÓ - no se pudo insertar primer alumno: %', SQLERRM;
    END;

    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_f, v_clase);
        RAISE NOTICE 'T6 OK parte 2 - segundo alumno ocupa cupo 2/2';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T6 FALLÓ - no se pudo insertar segundo alumno: %', SQLERRM;
    END;

    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_g, v_clase);
        RAISE EXCEPTION 'T6 FALLÓ - tercer alumno entró con cupo lleno';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Clase llena%' THEN
            RAISE NOTICE 'T6 OK - tercer alumno rechazado (Clase llena)';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- ── T7: Cancelados NO ocupan cupo (regresión bug 0/18) ─────────────────
DO $$
DECLARE
    v_g uuid := (SELECT v FROM test_ctx WHERE k='user_g');
    v_h uuid := (SELECT v FROM test_ctx WHERE k='user_h');
    v_clase uuid := (SELECT v FROM test_ctx WHERE k='clase_cupo');
BEGIN
    -- Marcamos como cancelada la inscripción del primer alumno (user_e)
    UPDATE clase_usuario
       SET asistencia = 'cancelado'
     WHERE usuario_id = (SELECT v FROM test_ctx WHERE k='user_e')
       AND clase_id = v_clase;

    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_g, v_clase);
        RAISE NOTICE 'T7 OK parte 1 - cancelado NO ocupa cupo (entra user_g)';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T7 FALLÓ - cancelado bloquea el cupo: %', SQLERRM;
    END;

    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_h, v_clase);
        RAISE EXCEPTION 'T7 FALLÓ - entró user_h con cupo lleno (2 activos)';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Clase llena%' THEN
            RAISE NOTICE 'T7 OK parte 2 - con 2 activos (1 cancelado) se rechaza al 3ro';
        ELSE
            RAISE;
        END IF;
    END;
END $$;

-- ── T8: Re-inscripción (delete + insert del flujo JS) descuenta token ──
DO $$
DECLARE
    v_usuario uuid := (SELECT v FROM test_ctx WHERE k='user_a');
    v_clase   uuid := (SELECT v FROM test_ctx WHERE k='clase_tokens');
    v_ins_old uuid := (SELECT v FROM test_ctx WHERE k='ins_a1');
    usados_antes int;
    usados_despues int;
    v_ins uuid;
BEGIN
    -- Estado previo: ins_a1 está cancelada (la marcamos aquí)
    UPDATE clase_usuario SET asistencia = 'cancelado' WHERE id = v_ins_old;
    SELECT tokens_usados INTO usados_antes FROM membresia WHERE usuario_id = v_usuario;

    -- Flujo de re-inscripción: eliminar la fila cancelada + insertar nueva
    DELETE FROM clase_usuario WHERE id = v_ins_old;
    BEGIN
        INSERT INTO clase_usuario (usuario_id, clase_id) VALUES (v_usuario, v_clase) RETURNING id INTO v_ins;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'T8 FALLÓ - re-inscripción rechazada: %', SQLERRM;
    END;

    SELECT tokens_usados INTO usados_despues FROM membresia WHERE usuario_id = v_usuario;
    IF usados_despues <> usados_antes + 1 THEN
        RAISE EXCEPTION 'T8 FALLÓ - re-inscripción no descontó token (% -> %)', usados_antes, usados_despues;
    END IF;
    RAISE NOTICE 'T8 OK - re-inscripción descuenta token (% -> %)', usados_antes, usados_despues;
END $$;

-- ── CLEANUP ────────────────────────────────────────────────────────────
DO $$
BEGIN
    DELETE FROM clase_usuario
    WHERE usuario_id IN (SELECT v FROM test_ctx WHERE k LIKE 'user_%')
       OR clase_id IN (SELECT v FROM test_ctx WHERE k LIKE 'clase_%');
    DELETE FROM membresia WHERE usuario_id IN (SELECT v FROM test_ctx WHERE k LIKE 'user_%');
    DELETE FROM clase WHERE id IN (SELECT v FROM test_ctx WHERE k LIKE 'clase_%');
    DELETE FROM plan WHERE id IN (SELECT v FROM test_ctx WHERE k = 'plan');
    DELETE FROM usuario WHERE id IN (SELECT v FROM test_ctx WHERE k LIKE 'user_%');
    RAISE NOTICE 'CLEANUP OK - TODO listo, todos los tests pasaron';
END $$;