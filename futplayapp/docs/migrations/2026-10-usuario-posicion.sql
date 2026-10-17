-- Posición de juego del usuario (oct-2026). La elige el propio jugador en
-- "Mi Perfil"; es opcional (null = sin definir).

create type posicion_jugador as enum (
    'arquero',
    'lateral_derecho',
    'lateral_izquierdo',
    'defensa_central',
    'volante_contencion',
    'volante_creativo',
    'delantero_izquierdo',
    'delantero_derecho',
    'delantero_centro'
);

alter table usuario add column if not exists posicion posicion_jugador;

-- Si ya se aplicó 2026-10-usuario-columnas-editables.sql (escritura solo por
-- columna), el jugador necesita permiso explícito para editar su posición.
grant update (posicion) on usuario to authenticated;
