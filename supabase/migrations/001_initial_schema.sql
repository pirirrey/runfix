-- ═══════════════════════════════════════════════════════════
-- WePlan — Schema inicial
-- Ejecutar en: Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- TIPOS
-- ─────────────────────────────────────────────
create type public.user_role as enum ('coach', 'runner');


-- ─────────────────────────────────────────────
-- PROFILES (extiende auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.user_role not null,
  created_at  timestamptz not null default now()
);

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────
create table public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  coach_id     uuid not null references public.profiles(id) on delete cascade,
  invite_code  text not null unique default upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at   timestamptz not null default now()
);

create index teams_coach_id_idx   on public.teams(coach_id);
create index teams_invite_code_idx on public.teams(invite_code);


-- ─────────────────────────────────────────────
-- TEAM MEMBERSHIPS (runners en un equipo)
-- ─────────────────────────────────────────────
create table public.team_memberships (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  runner_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (team_id, runner_id)
);

create index memberships_team_id_idx   on public.team_memberships(team_id);
create index memberships_runner_id_idx on public.team_memberships(runner_id);


-- ─────────────────────────────────────────────
-- TRAINING PLANS
-- ─────────────────────────────────────────────
create table public.training_plans (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  runner_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete cascade,
  plan_month    date not null,           -- primer día del mes: 2026-03-01
  storage_path  text not null,           -- {teamId}/{runnerId}/{year}-{month}.pdf
  file_name     text not null,
  file_size     bigint,
  notes         text,
  uploaded_at   timestamptz not null default now(),
  unique (team_id, runner_id, plan_month)
);

create index plans_runner_id_idx on public.training_plans(runner_id);
create index plans_team_id_idx   on public.training_plans(team_id);
create index plans_month_idx     on public.training_plans(plan_month);


-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════

alter table public.profiles         enable row level security;
alter table public.teams            enable row level security;
alter table public.team_memberships enable row level security;
alter table public.training_plans   enable row level security;


-- ─────────────────────────────────────────────
-- PROFILES policies
-- ─────────────────────────────────────────────
create policy "profiles: authenticated read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: own update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ─────────────────────────────────────────────
-- TEAMS policies
-- ─────────────────────────────────────────────
create policy "teams: coach read own"
  on public.teams for select
  to authenticated
  using (coach_id = auth.uid());

create policy "teams: runner read joined"
  on public.teams for select
  to authenticated
  using (
    exists (
      select 1 from public.team_memberships
      where team_id = teams.id and runner_id = auth.uid()
    )
  );

create policy "teams: coach insert"
  on public.teams for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
  );

create policy "teams: coach update own"
  on public.teams for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "teams: coach delete own"
  on public.teams for delete
  to authenticated
  using (coach_id = auth.uid());


-- ─────────────────────────────────────────────
-- TEAM_MEMBERSHIPS policies
-- ─────────────────────────────────────────────
create policy "memberships: coach read"
  on public.team_memberships for select
  to authenticated
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_memberships.team_id
        and teams.coach_id = auth.uid()
    )
  );

create policy "memberships: runner read own"
  on public.team_memberships for select
  to authenticated
  using (runner_id = auth.uid());

create policy "memberships: runner insert own"
  on public.team_memberships for insert
  to authenticated
  with check (
    runner_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'runner'
    )
  );

create policy "memberships: coach delete"
  on public.team_memberships for delete
  to authenticated
  using (
    exists (
      select 1 from public.teams
      where teams.id = team_memberships.team_id
        and teams.coach_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────
-- TRAINING_PLANS policies
-- ─────────────────────────────────────────────
create policy "plans: runner read own"
  on public.training_plans for select
  to authenticated
  using (runner_id = auth.uid());

create policy "plans: coach read own"
  on public.training_plans for select
  to authenticated
  using (coach_id = auth.uid());

create policy "plans: coach insert"
  on public.training_plans for insert
  to authenticated
  with check (
    coach_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'coach'
    )
    and exists (
      select 1 from public.team_memberships
      where team_id = training_plans.team_id
        and runner_id = training_plans.runner_id
    )
  );

create policy "plans: coach update own"
  on public.training_plans for update
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "plans: coach delete own"
  on public.training_plans for delete
  to authenticated
  using (coach_id = auth.uid());


-- ═══════════════════════════════════════════════════════════
-- STORAGE — ejecutar luego de crear el bucket "training-plans"
-- ═══════════════════════════════════════════════════════════

-- Crear bucket (o hacerlo desde el Dashboard de Supabase):
-- insert into storage.buckets (id, name, public) values ('training-plans', 'training-plans', false);

-- Coach sube archivos a sus equipos
create policy "storage: coach upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'training-plans'
    and exists (
      select 1 from public.teams
      where teams.id::text = (storage.foldername(name))[1]
        and teams.coach_id = auth.uid()
    )
  );

-- Coach puede leer archivos de sus equipos
create policy "storage: coach read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'training-plans'
    and exists (
      select 1 from public.teams
      where teams.id::text = (storage.foldername(name))[1]
        and teams.coach_id = auth.uid()
    )
  );

-- Runner puede leer sus propios archivos
create policy "storage: runner read own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'training-plans'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Coach puede borrar archivos de sus equipos
create policy "storage: coach delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'training-plans'
    and exists (
      select 1 from public.teams
      where teams.id::text = (storage.foldername(name))[1]
        and teams.coach_id = auth.uid()
    )
  );
