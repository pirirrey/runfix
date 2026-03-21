-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 003: Runner se asocia a Coach (no a equipo directamente)
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Agregar invite_code personal a profiles (para coaches)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists invite_code text unique
    default upper(substring(gen_random_uuid()::text, 1, 8));

-- Generar invite_code para perfiles existentes que no lo tengan
update public.profiles
  set invite_code = upper(substring(gen_random_uuid()::text, 1, 8))
  where invite_code is null;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Tabla coach_runners: relación runner ↔ coach
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.coach_runners (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  runner_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (coach_id, runner_id)
);

create index if not exists coach_runners_coach_id_idx  on public.coach_runners(coach_id);
create index if not exists coach_runners_runner_id_idx on public.coach_runners(runner_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS en coach_runners
-- ─────────────────────────────────────────────────────────────────────────
alter table public.coach_runners enable row level security;

-- Coach ve sus propios runners
create policy "coach_runners: coach read"
  on public.coach_runners for select
  to authenticated
  using (coach_id = auth.uid());

-- Runner ve los coaches a los que está asociado
create policy "coach_runners: runner read own"
  on public.coach_runners for select
  to authenticated
  using (runner_id = auth.uid());

-- Runner puede unirse (insert) a un coach
create policy "coach_runners: runner insert"
  on public.coach_runners for insert
  to authenticated
  with check (
    runner_id = auth.uid()
    and exists (
      select 1 from public.profiles where id = auth.uid() and role = 'runner'
    )
  );

-- Coach puede eliminar un runner de su pool
create policy "coach_runners: coach delete"
  on public.coach_runners for delete
  to authenticated
  using (coach_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Actualizar RLS de team_memberships
--    El runner ya NO se auto-agrega; lo hace el coach
-- ─────────────────────────────────────────────────────────────────────────

-- Eliminar política que permitía al runner insertar su propia membresía
drop policy if exists "memberships: runner insert own" on public.team_memberships;

-- El coach puede insertar membresías en sus equipos
-- (verificamos que el equipo pertenece al coach que hace la acción)
create policy "memberships: coach insert"
  on public.team_memberships for insert
  to authenticated
  with check (
    exists (
      select 1 from public.teams
      where id = team_id and coach_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Función RPC para encontrar coach por invite code
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.get_coach_by_invite_code(p_code text)
returns table (
  id        uuid,
  full_name text,
  email     text
)
language sql
security definer
set search_path = public
as $$
  select id, full_name, email
  from public.profiles
  where invite_code = upper(trim(p_code))
    and role = 'coach'
    and status = 'approved'
  limit 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Grants
-- ─────────────────────────────────────────────────────────────────────────
grant all on public.coach_runners to anon, authenticated;
grant execute on function public.get_coach_by_invite_code(text) to anon, authenticated;
