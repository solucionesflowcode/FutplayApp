| table_name    | column_name      | data_type                   | is_nullable | column_default         |
| ------------- | ---------------- | --------------------------- | ----------- | ---------------------- |
| boleta        | id               | uuid                        | NO          | gen_random_uuid()      |
| boleta        | usuario_id       | uuid                        | NO          | null                   |
| boleta        | estado           | text                        | NO          | null                   |
| boleta        | total            | integer                     | NO          | 0                      |
| boleta        | transaccion_id   | text                        | YES         | null                   |
| boleta        | created_at       | timestamp without time zone | YES         | now()                  |
| boleta        | updated_at       | timestamp without time zone | YES         | now()                  |
| boleta_item   | id               | uuid                        | NO          | gen_random_uuid()      |
| boleta_item   | boleta_id        | uuid                        | YES         | null                   |
| boleta_item   | producto_id      | uuid                        | YES         | null                   |
| boleta_item   | cantidad         | integer                     | NO          | 1                      |
| boleta_item   | precio           | integer                     | NO          | null                   |
| boleta_item   | total            | integer                     | NO          | null                   |
| capsula       | id               | uuid                        | NO          | gen_random_uuid()      |
| capsula       | titulo           | text                        | NO          | null                   |
| capsula       | modulo_id        | uuid                        | YES         | null                   |
| capsula       | duracion         | interval                    | YES         | null                   |
| capsula       | order_index      | integer                     | YES         | null                   |
| capsula       | created_at       | timestamp with time zone    | YES         | now()                  |
| capsula       | descripcion      | text                        | YES         | null                   |
| capsula       | creado           | text                        | YES         | null                   |
| capsula       | imagen           | text                        | YES         | null                   |
| capsula       | bunny_video_id   | text                        | YES         | null                   |
| categoria     | id               | uuid                        | NO          | gen_random_uuid()      |
| categoria     | nombre           | text                        | NO          | null                   |
| categoria     | created_at       | timestamp with time zone    | YES         | now()                  |
| clase         | id               | uuid                        | NO          | gen_random_uuid()      |
| clase         | nombre           | text                        | NO          | null                   |
| clase         | sede_id          | uuid                        | YES         | null                   |
| clase         | cupo_maximo      | integer                     | YES         | 15                     |
| clase         | created_at       | timestamp without time zone | YES         | now()                  |
| clase         | titulo           | text                        | YES         | 'Clase'::text          |
| clase         | descripcion      | text                        | YES         | null                   |
| clase         | fecha_hora       | timestamp without time zone | YES         | null                   |
| clase_usuario | id               | uuid                        | NO          | gen_random_uuid()      |
| clase_usuario | clase_id         | uuid                        | NO          | null                   |
| clase_usuario | usuario_id       | uuid                        | YES         | null                   |
| clase_usuario | created_at       | timestamp without time zone | YES         | now()                  |
| clase_usuario | asistencia       | USER-DEFINED                | YES         | null                   |
| ficha_medica  | usuario_id       | uuid                        | NO          | null                   |
| ficha_medica  | edad             | integer                     | YES         | null                   |
| ficha_medica  | peso_kg          | numeric                     | YES         | null                   |
| ficha_medica  | estatura_cm      | integer                     | YES         | null                   |
| ficha_medica  | grupo_sanguineo  | text                        | YES         | null                   |
| ficha_medica  | enfermedades     | text                        | YES         | 'Ninguna'::text        |
| ficha_medica  | alergias         | text                        | YES         | 'Ninguna'::text        |
| ficha_medica  | medicamentos     | text                        | YES         | null                   |
| ficha_medica  | observaciones    | text                        | YES         | null                   |
| ficha_medica  | updated_at       | timestamp without time zone | YES         | now()                  |
| ficha_medica  | imc              | real                        | YES         | null                   |
| membresia     | id               | uuid                        | NO          | gen_random_uuid()      |
| membresia     | usuario_id       | uuid                        | NO          | null                   |
| membresia     | plan_id          | uuid                        | NO          | null                   |
| membresia     | mes              | date                        | NO          | null                   |
| membresia     | tokens_totales   | integer                     | NO          | 0                      |
| membresia     | tokens_usados    | integer                     | NO          | 0                      |
| membresia     | created_at       | timestamp without time zone | YES         | now()                  |
| membresia     | estado           | boolean                     | NO          | true                   |
| modulo        | id               | uuid                        | NO          | gen_random_uuid()      |
| modulo        | nombre           | text                        | NO          | null                   |
| modulo        | created_at       | timestamp with time zone    | YES         | now()                  |
| modulo        | duracion         | interval                    | YES         | null                   |
| modulo        | descripcion      | text                        | NO          | null                   |
| modulo        | categoria_id     | uuid                        | YES         | null                   |
| plan          | id               | uuid                        | NO          | gen_random_uuid()      |
| plan          | nombre           | text                        | NO          | null                   |
| plan          | tokens_mensuales | integer                     | NO          | null                   |
| plan          | precio           | integer                     | YES         | null                   |
| plan          | created_at       | timestamp without time zone | YES         | now()                  |
| producto      | id               | uuid                        | NO          | gen_random_uuid()      |
| producto      | nombre           | text                        | YES         | null                   |
| producto      | tipo             | text                        | YES         | null                   |
| producto      | precio           | integer                     | NO          | null                   |
| sede          | id               | uuid                        | NO          | gen_random_uuid()      |
| sede          | nombre           | text                        | NO          | null                   |
| usuario       | id               | uuid                        | NO          | null                   |
| usuario       | nombre           | text                        | YES         | null                   |
| usuario       | created_at       | timestamp without time zone | YES         | now()                  |
| usuario       | email            | text                        | NO          | 'NOT NULL'::text       |
| usuario       | rol              | USER-DEFINED                | YES         | 'jugador'::rol_usuario |
| usuario       | telefono         | text                        | YES         | null                   |
| usuario       | rut              | text                        | YES         | null                   |

> **Histórico**: se eliminó la tabla `horario` (2026-06).
> - `clase.fecha_hora` fue agregada (migrada desde `horario.fecha_hora`).
> - `clase_usuario.clase_id` cambió de nullable a NOT NULL con FK a `clase(id)`.
> - `clase_usuario.asistencia` es tipo `asistencia` (enum), no boolean.
> - Se eliminó `clase_usuario.horario_id` y su FK.
