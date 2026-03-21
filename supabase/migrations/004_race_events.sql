-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 004: Módulo de Eventos de Carrera
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Eventos de carrera
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.race_events (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  location      text,
  race_type     text not null check (race_type in ('street', 'trail')),
  start_date    date not null,
  end_date      date not null,
  discount_code text,
  notes         text,
  created_at    timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists race_events_coach_id_idx on public.race_events(coach_id);
create index if not exists race_events_start_date_idx on public.race_events(start_date);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Distancias por evento
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.race_event_distances (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.race_events(id) on delete cascade,
  label          text not null,     -- "10k", "21k", "42k", "70k", texto libre
  altimetry_path text,              -- path en storage training-plans
  created_at     timestamptz not null default now()
);

create index if not exists race_event_distances_event_id_idx on public.race_event_distances(event_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Archivos informativos del evento
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.race_event_files (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.race_events(id) on delete cascade,
  file_name    text not null,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index if not exists race_event_files_event_id_idx on public.race_event_files(event_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Objetivos del runner (Mis Objetivos)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.runner_event_goals (
  id          uuid primary key default gen_random_uuid(),
  runner_id   uuid not null references public.profiles(id) on delete cascade,
  distance_id uuid not null references public.race_event_distances(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (runner_id, distance_id)
);

create index if not exists runner_event_goals_runner_id_idx on public.runner_event_goals(runner_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. RLS — race_events
-- ─────────────────────────────────────────────────────────────────────────
alter table public.race_events enable row level security;

-- Coach ve y gestiona sus propios eventos
create policy "events: coach all"
  on public.race_events for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Runners ven eventos de coaches a los que están asociados
create policy "events: runner read"
  on public.race_events for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_runners
      where coach_id = race_events.coach_id
        and runner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 6. RLS — race_event_distances
-- ─────────────────────────────────────────────────────────────────────────
alter table public.race_event_distances enable row level security;

-- Coach gestiona distancias de sus eventos
create policy "distances: coach all"
  on public.race_event_distances for all
  to authenticated
  using (
    exists (select 1 from public.race_events where id = event_id and coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.race_events where id = event_id and coach_id = auth.uid())
  );

-- Runner lee distancias de eventos de sus coaches
create policy "distances: runner read"
  on public.race_event_distances for select
  to authenticated
  using (
    exists (
      select 1 from public.race_events e
      join public.coach_runners cr on cr.coach_id = e.coach_id
      where e.id = event_id and cr.runner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 7. RLS — race_event_files
-- ─────────────────────────────────────────────────────────────────────────
alter table public.race_event_files enable row level security;

create policy "event_files: coach all"
  on public.race_event_files for all
  to authenticated
  using (
    exists (select 1 from public.race_events where id = event_id and coach_id = auth.uid())
  )
  with check (
    exists (select 1 from public.race_events where id = event_id and coach_id = auth.uid())
  );

create policy "event_files: runner read"
  on public.race_event_files for select
  to authenticated
  using (
    exists (
      select 1 from public.race_events e
      join public.coach_runners cr on cr.coach_id = e.coach_id
      where e.id = event_id and cr.runner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 8. RLS — runner_event_goals
-- ─────────────────────────────────────────────────────────────────────────
alter table public.runner_event_goals enable row level security;

-- Runner gestiona sus propios objetivos
create policy "goals: runner all"
  on public.runner_event_goals for all
  to authenticated
  using (runner_id = auth.uid())
  with check (runner_id = auth.uid());

-- Coach puede leer los objetivos de sus runners
create policy "goals: coach read"
  on public.runner_event_goals for select
  to authenticated
  using (
    exists (
      select 1 from public.coach_runners
      where coach_id = auth.uid() and runner_id = runner_event_goals.runner_id
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Grants
-- ─────────────────────────────────────────────────────────────────────────
grant all on public.race_events          to anon, authenticated;
grant all on public.race_event_distances to anon, authenticated;
grant all on public.race_event_files     to anon, authenticated;
grant all on public.runner_event_goals   to anon, authenticated;
