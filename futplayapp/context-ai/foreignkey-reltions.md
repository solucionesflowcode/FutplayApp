| table_name    | column_name  | foreign_table_name | foreign_column_name |
| ------------- | ------------ | ------------------ | ------------------- |
| clase         | sede_id      | sede               | id                  |
| clase_usuario | clase_id     | clase              | id                  |
| clase_usuario | usuario_id   | usuario            | id                  |
| boleta        | usuario_id   | usuario            | id                  |
| membresia     | usuario_id   | usuario            | id                  |
| membresia     | plan_id      | plan               | id                  |
| boleta_item   | boleta_id    | boleta             | id                  |
| boleta_item   | producto_id  | producto           | id                  |
| capsula       | modulo_id    | modulo             | id                  |
| modulo        | categoria_id | categoria          | id                  |
| ficha_medica  | usuario_id   | usuario            | id                  |

> **Histórico**: se eliminaron las FK `horario.clase_id → clase.id` y `clase_usuario.horario_id → horario.id` junto con la tabla `horario`.
> Se agregó `clase_usuario.clase_id → clase.id`.
