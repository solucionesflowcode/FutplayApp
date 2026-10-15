-- Ajustes del admin (oct-2026):
--  1. membresia.numero_boleta: folio de una boleta externa (efectivo/transferencia).
--     Las analíticas solo cuentan membresías con boleta (boleta_id de Flow o este número).
--  2. plan.oculto: el plan sale del catálogo y solo se compra con su link
--     (como los familiares). plan tiene grants por columna: se abre la nueva.
--  3. usuario.sede_id: sede principal del usuario, para separar la contabilidad.

alter table membresia add column if not exists numero_boleta text;

alter table plan add column if not exists oculto boolean not null default false;
grant select (oculto) on plan to anon, authenticated;

alter table usuario add column if not exists sede_id uuid references sede(id) on delete set null;
create index if not exists usuario_sede_id_idx on usuario(sede_id);
