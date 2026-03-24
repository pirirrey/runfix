-- ================================================================
-- 015 — Sedes seleccionables por runner (campo runner_selectable)
-- Por defecto true: el runner puede elegirla desde sus preferencias
-- Si es false: solo el coach puede asignarla
-- ================================================================

alter table public.coach_venues
  add column if not exists runner_selectable boolean not null default true;
