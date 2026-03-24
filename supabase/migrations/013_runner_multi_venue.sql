-- ================================================================
-- 013 — Multi-sede por runner (junction table)
-- Reemplaza el venue_id singular en coach_runners
-- ================================================================

-- Tabla de unión runner ↔ sede
create table if not exists public.runner_venues (
  coach_id   uuid not null references public.profiles(id)     on delete cascade,
  runner_id  uuid not null references public.profiles(id)     on delete cascade,
  venue_id   uuid not null references public.coach_venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, runner_id, venue_id)
);

alter table public.runner_venues enable row level security;

create policy "coach_manage_runner_venues" on public.runner_venues
  for all using (coach_id = auth.uid());

create policy "runner_view_own_venues" on public.runner_venues
  for select using (runner_id = auth.uid());

grant all on public.runner_venues to authenticated;
grant all on public.runner_venues to service_role;

-- Migrar datos existentes de coach_runners.venue_id → runner_venues
insert into public.runner_venues (coach_id, runner_id, venue_id)
select coach_id, runner_id, venue_id
from public.coach_runners
where venue_id is not null
on conflict do nothing;

-- Quitar la columna singular ahora reemplazada
alter table public.coach_runners drop column if exists venue_id;
