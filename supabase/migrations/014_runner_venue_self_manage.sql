-- ================================================================
-- 014 — Runner puede gestionar sus propias asignaciones de sede
-- ================================================================

-- Reemplazar la política solo-SELECT por una que permite todo
-- pero solo para coaches con los que está asociado
drop policy if exists "runner_view_own_venues" on public.runner_venues;

create policy "runner_manage_own_venues" on public.runner_venues
  for all
  using (
    runner_id = auth.uid()
    and exists (
      select 1 from public.coach_runners cr
      where cr.coach_id = runner_venues.coach_id
        and cr.runner_id = auth.uid()
    )
  )
  with check (
    runner_id = auth.uid()
    and exists (
      select 1 from public.coach_runners cr
      where cr.coach_id = runner_venues.coach_id
        and cr.runner_id = auth.uid()
    )
    and exists (
      select 1 from public.coach_venues cv
      where cv.id = runner_venues.venue_id
        and cv.coach_id = runner_venues.coach_id
    )
  );
