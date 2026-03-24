-- ═══════════════════════════════════════════════════════════════════
-- 019 — Consolidado de migraciones pendientes (011 → 018 + 016b)
-- Se puede ejecutar de forma segura incluso si algunas ya fueron
-- aplicadas, gracias a los guards IF NOT EXISTS / IF EXISTS.
-- ═══════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────
-- 011 — Sedes y horarios de entrenamiento del coach
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.coach_venues (
  id          uuid        primary key default gen_random_uuid(),
  coach_id    uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  notes       text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.venue_sessions (
  id          uuid        primary key default gen_random_uuid(),
  venue_id    uuid        not null references public.coach_venues(id) on delete cascade,
  location    text        not null,
  days        integer[]   not null default '{}',
  start_time  text        not null,
  notes       text,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.coach_venues   enable row level security;
alter table public.venue_sessions enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'coach_venues' and policyname = 'coach_manage_venues') then
    create policy "coach_manage_venues" on public.coach_venues for all using (coach_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'venue_sessions' and policyname = 'coach_manage_venue_sessions') then
    create policy "coach_manage_venue_sessions" on public.venue_sessions for all
      using (exists (select 1 from public.coach_venues v where v.id = venue_sessions.venue_id and v.coach_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'coach_venues' and policyname = 'runner_view_venues') then
    create policy "runner_view_venues" on public.coach_venues for select
      using (exists (select 1 from public.coach_runners cr where cr.coach_id = coach_venues.coach_id and cr.runner_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'venue_sessions' and policyname = 'runner_view_venue_sessions') then
    create policy "runner_view_venue_sessions" on public.venue_sessions for select
      using (exists (select 1 from public.coach_venues v join public.coach_runners cr on cr.coach_id = v.coach_id where v.id = venue_sessions.venue_id and cr.runner_id = auth.uid()));
  end if;
end $$;

grant all on public.coach_venues   to authenticated;
grant all on public.coach_venues   to service_role;
grant all on public.venue_sessions to authenticated;
grant all on public.venue_sessions to service_role;

-- ──────────────────────────────────────────────────────────────────
-- 013 — runner_venues (multi-sede por runner)
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.runner_venues (
  coach_id   uuid not null references public.profiles(id)     on delete cascade,
  runner_id  uuid not null references public.profiles(id)     on delete cascade,
  venue_id   uuid not null references public.coach_venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coach_id, runner_id, venue_id)
);

alter table public.runner_venues enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'runner_venues' and policyname = 'coach_manage_runner_venues') then
    create policy "coach_manage_runner_venues" on public.runner_venues for all using (coach_id = auth.uid());
  end if;
end $$;

grant all on public.runner_venues to authenticated;
grant all on public.runner_venues to service_role;

-- Migrar venue_id singular de coach_runners si existe
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'coach_runners' and column_name = 'venue_id') then
    insert into public.runner_venues (coach_id, runner_id, venue_id)
    select coach_id, runner_id, venue_id
    from public.coach_runners
    where venue_id is not null
    on conflict do nothing;
    alter table public.coach_runners drop column if exists venue_id;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- 014 — Runner puede gestionar sus propias asignaciones de sede
-- ──────────────────────────────────────────────────────────────────
do $$ begin
  if exists (select 1 from pg_policies where tablename = 'runner_venues' and policyname = 'runner_view_own_venues') then
    drop policy "runner_view_own_venues" on public.runner_venues;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'runner_venues' and policyname = 'runner_manage_own_venues') then
    create policy "runner_manage_own_venues" on public.runner_venues
      for all
      using (
        runner_id = auth.uid()
        and exists (select 1 from public.coach_runners cr where cr.coach_id = runner_venues.coach_id and cr.runner_id = auth.uid())
      )
      with check (
        runner_id = auth.uid()
        and exists (select 1 from public.coach_runners cr where cr.coach_id = runner_venues.coach_id and cr.runner_id = auth.uid())
        and exists (select 1 from public.coach_venues cv where cv.id = runner_venues.venue_id and cv.coach_id = runner_venues.coach_id)
      );
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- 015 — runner_selectable en coach_venues
-- ──────────────────────────────────────────────────────────────────
alter table public.coach_venues
  add column if not exists runner_selectable boolean not null default true;

-- ──────────────────────────────────────────────────────────────────
-- 016a — Agregar "suspended" al check constraint de profiles.status
-- ──────────────────────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended'));

-- ──────────────────────────────────────────────────────────────────
-- 016b — Mensajes del coach al grupo (team_messages)
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.team_messages (
  id         uuid        primary key default gen_random_uuid(),
  team_id    uuid        not null references public.teams(id)    on delete cascade,
  coach_id   uuid        not null references public.profiles(id) on delete cascade,
  message    text        not null,
  expires_at date        not null,
  created_at timestamptz not null default now()
);

alter table public.team_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'team_messages' and policyname = 'coach_manage_own_messages') then
    create policy "coach_manage_own_messages" on public.team_messages
      for all to authenticated
      using  (coach_id = auth.uid())
      with check (coach_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'team_messages' and policyname = 'runner_view_team_messages') then
    create policy "runner_view_team_messages" on public.team_messages
      for select to authenticated
      using (
        expires_at >= current_date
        and team_id in (select team_id from public.team_memberships where runner_id = auth.uid())
      );
  end if;
end $$;

grant all on public.team_messages to authenticated;
grant all on public.team_messages to service_role;

-- ──────────────────────────────────────────────────────────────────
-- 017 — subscription_plan en profiles (para coaches)
-- ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists subscription_plan text not null default 'starter'
    check (subscription_plan in ('starter', 'pro', 'elite'));

-- Actualizar trigger handle_new_user para capturar el plan desde el signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, subscription_plan)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'role')::public.user_role,
    coalesce(new.raw_user_meta_data->>'subscription_plan', 'starter')
  );
  return new;
end;
$$;

grant all on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- ──────────────────────────────────────────────────────────────────
-- 018 — Flags opcionales para modalidades de pago del coach
-- ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists plan_annual_enabled boolean not null default false,
  add column if not exists plan_exempt_enabled boolean not null default false;
