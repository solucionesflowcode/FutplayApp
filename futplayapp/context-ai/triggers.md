| table_name    | trigger_name                | action_timing | event_manipulation | action_statement                             |
| ------------- | --------------------------- | ------------- | ------------------ | -------------------------------------------- |
| boleta        | trigger_procesar_boleta     | AFTER         | UPDATE             | EXECUTE FUNCTION procesar_boleta_pagada()    |
| clase_usuario | trigger_limite_15           | BEFORE        | INSERT             | EXECUTE FUNCTION limitar_15_alumnos()        |
| clase_usuario | trigger_inscripcion         | BEFORE        | INSERT             | EXECUTE FUNCTION manejar_inscripcion_clase() |
| clase_usuario | trigger_limitar_15_alumnos  | BEFORE        | INSERT             | EXECUTE FUNCTION limitar_15_alumnos()        |
| membresia     | trigger_prevenir_doble_plan | BEFORE        | INSERT             | EXECUTE FUNCTION check_membresia_activa()    |

> **Nota**: los triggers sobre `clase_usuario` usan `NEW.clase_id` (columna existente post-migración). No requirieron cambios.
