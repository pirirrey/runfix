-- ═══════════════════════════════════════════════════════════
-- WePlan — Superadmin + Coach approval
-- ⚠️  IMPORTANTE: correr en DOS pasos separados en el SQL Editor
-- ═══════════════════════════════════════════════════════════


-- ══════════════════════════════════════════
-- PASO 1 — Correr esto solo y hacer "Run"
-- ══════════════════════════════════════════

alter type public.user_role add value if not exists 'superadmin';


-- ══════════════════════════════════════════════════════════════
-- PASO 2 — Luego de que el Paso 1 haya committeado, correr esto
-- ══════════════════════════════════════════════════════════════

-- Columna 'status' en profiles
alter table public.profiles
  add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- Coaches ya existentes quedan aprobados
update public.profiles
  set status = 'approved'
  where role = 'coach';


-- Trigger actualizado: coaches nuevos → pending
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role public.user_role;
  v_status text;
begin
  v_role := (new.raw_user_meta_data->>'role')::public.user_role;

  if v_role = 'coach' then
    v_status := 'pending';
  else
    v_status := 'approved';
  end if;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    v_role,
    v_status
  );
  return new;
end;
$$;


-- Función helper: is_superadmin()
create or replace function public.is_superadmin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;


-- RLS: superadmin lee y actualiza todos los perfiles
drop policy if exists "profiles: superadmin all" on public.profiles;

create policy "profiles: superadmin all"
  on public.profiles
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());


-- RLS: superadmin lee todos los equipos
drop policy if exists "teams: superadmin read" on public.teams;

create policy "teams: superadmin read"
  on public.teams for select
  to authenticated
  using (public.is_superadmin());


-- ─────────────────────────────────────────────
-- PASO 3 — Crear el primer superadmin
-- ─────────────────────────────────────────────
-- a) Registrate en la app con el email del admin (cualquier rol)
-- b) Ejecutá esto reemplazando el email:
--
-- update public.profiles
--   set role = 'superadmin', status = 'approved'
--   where email = 'admin@tuemail.com';
--
-- ═══════════════════════════════════════════════════════════
