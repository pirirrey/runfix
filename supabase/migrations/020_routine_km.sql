-- Agregar km estimados a rutinas diarias
alter table public.daily_routines
  add column if not exists km_estimated numeric(6,2) null;
