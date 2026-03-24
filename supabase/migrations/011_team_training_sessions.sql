-- ================================================================
-- 011 — Sedes y horarios de entrenamiento del coach
-- Modelo de dos niveles:
--   coach_venues   → Sede (ej: "Parque San Martín", "El Bosque")
--   venue_sessions → Horario dentro de la sede (días + hora + lugar)
-- ================================================================

-- Sedes de entrenamiento
create table if not exists public.coach_venues (
  id          uuid        primary key default gen_random_uuid(),
  coach_id    uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  notes       text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Horarios / puntos de encuentro dentro de cada sede
create table if not exists public.venue_sessions (
  id          uuid        primary key default gen_random_uuid(),
  venue_id    uuid        not null references public.coach_venues(id) on delete cascade,
  location    text        not null,
  days        integer[]   not null default '{}',  -- 0=Lun … 6=Dom
  start_time  text        not null,               -- "HH:MM"
  notes       text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.coach_venues   enable row level security;
alter table public.venue_sessions enable row level security;

-- Coach gestiona sus propias sedes
create policy "coach_manage_venues"
  on public.coach_venues for all
  using (coach_id = auth.uid());

-- Coach gestiona horarios de sus sedes
create policy "coach_manage_venue_sessions"
  on public.venue_sessions for all
  using (
    exists (
      select 1 from public.coach_venues v
      where v.id = venue_sessions.venue_id
        and v.coach_id = auth.uid()
    )
  );

-- Runners ven sedes de sus coaches
create policy "runner_view_venues"
  on public.coach_venues for select
  using (
    exists (
      select 1 from public.coach_runners cr
      where cr.coach_id = coach_venues.coach_id
        and cr.runner_id = auth.uid()
    )
  );

-- Runners ven horarios de las sedes de sus coaches
create policy "runner_view_venue_sessions"
  on public.venue_sessions for select
  using (
    exists (
      select 1 from public.coach_venues v
      join public.coach_runners cr on cr.coach_id = v.coach_id
      where v.id = venue_sessions.venue_id
        and cr.runner_id = auth.uid()
    )
  );

grant all on public.coach_venues   to authenticated;
grant all on public.coach_venues   to service_role;
grant all on public.venue_sessions to authenticated;
grant all on public.venue_sessions to service_role;
