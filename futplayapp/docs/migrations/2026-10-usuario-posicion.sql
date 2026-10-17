-- Posición de juego del usuario (oct-2026). La elige el propio jugador en
-- "Mi Perfil"; es opcional (null = sin definir). usuario tiene grants a nivel
-- de tabla, así que la columna nueva no necesita un grant aparte.

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
