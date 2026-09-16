-- Ejecutar una vez en Supabase SQL Editor.
-- Extiende la cola existente para todo el ciclo del viaje Cliente <-> Chofer.
alter table public.solicitudes_viaje_conductor
  add column if not exists tipo_servicio text,
  add column if not exists conductor_nombre text,
  add column if not exists conductor_telefono text,
  add column if not exists conductor_vehiculo text,
  add column if not exists inicio_at timestamptz,
  add column if not exists finalizado_at timestamptz,
  add column if not exists calificacion integer,
  add column if not exists comentario_calificacion text;

alter table public.solicitudes_viaje_conductor
  drop constraint if exists solicitudes_viaje_conductor_estado_check;

alter table public.solicitudes_viaje_conductor
  add constraint solicitudes_viaje_conductor_estado_check
  check (estado in ('pendiente', 'aceptado', 'conductor_llegando', 'en_curso', 'completado', 'cancelado')) not valid;

create index if not exists solicitudes_viaje_conductor_estado_actualizado_idx
  on public.solicitudes_viaje_conductor (estado, updated_at desc);
