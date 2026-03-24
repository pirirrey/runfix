-- ═══════════════════════════════════════════════════════════
-- 017 — Plan de suscripción Runfix para coaches
-- ═══════════════════════════════════════════════════════════

-- Agregar columna
alter table public.profiles
  add column if not exists subscription_plan text
    not null default 'starter'
    check (subscription_plan in ('starter', 'pro', 'elite'));

-- Actualizar trigger para capturar el plan desde el signup
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
