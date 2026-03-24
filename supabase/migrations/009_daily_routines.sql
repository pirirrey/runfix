-- Rutinas diarias de entrenamiento por equipo
create table public.daily_routines (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.profiles(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  training_date date not null,
  routine       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.daily_routines enable row level security;

-- Coach: CRUD sobre las rutinas de sus equipos
create policy "Coach gestiona rutinas de su equipo"
  on public.daily_routines for all
  using  (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- Runner: puede leer rutinas de los equipos a los que pertenece
-- siempre que no esté suspendido por ese coach
create policy "Runner ve rutinas de su equipo"
  on public.daily_routines for select
  using (
    exists (
      select 1 from public.team_memberships tm
      where tm.team_id = daily_routines.team_id
        and tm.runner_id = auth.uid()
    )
    and exists (
      select 1 from public.coach_runners cr
      where cr.coach_id = daily_routines.coach_id
        and cr.runner_id = auth.uid()
        and coalesce(cr.suspended, false) = false
    )
  );
