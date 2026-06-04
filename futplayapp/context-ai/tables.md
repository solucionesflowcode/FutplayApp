| table_schema | table_name    |
| ------------ | ------------- |
| public       | boleta        |
| public       | boleta_item   |
| public       | capsula       |
| public       | categoria     |
| public       | clase         |
| public       | clase_usuario |
| public       | ficha_medica  |
| public       | membresia     |
| public       | modulo        |
| public       | plan          |
| public       | producto      |
| public       | sede          |
| public       | usuario       |

> **Histórico**: se eliminó la tabla `horario` (2026-06).
> `fecha_hora` se movió a `clase`. `clase_usuario` ahora referencia `clase` directamente vía `clase_id`.
