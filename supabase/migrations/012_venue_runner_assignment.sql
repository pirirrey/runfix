-- ================================================================
-- 012 — Sede por defecto + asignación de sede a runner
-- ================================================================

-- Sede por defecto del coach (solo una activa por vez)
alter table public.coach_venues
  add column if not exists is_default boolean not null default false;

-- Sede asignada al runner en el contexto de este coach
alter table public.coach_runners
  add column if not exists venue_id uuid references public.coach_venues(id) on delete set null;

-- ----------------------------------------------------------------
-- Política UPDATE en coach_runners (faltaba desde migración 003)
-- El coach puede actualizar campos de sus propios runners
-- (venue_id, suspended, etc.)
-- ----------------------------------------------------------------
drop policy if exists "coach_runners: coach update" on public.coach_runners;

create policy "coach_runners: coach update"
  on public.coach_runners for update
  to authenticated
  using  (coach_id = auth.uid())
  with check (coach_id = auth.uid());
