-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 006: Ajustar get_coach_by_invite_code para aceptar coaches
--   activos (status != 'pending' y != 'rejected'), en lugar de solo 'approved'
-- ═══════════════════════════════════════════════════════════════════════════

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
    and (status = 'approved' or status is null or status not in ('pending', 'rejected'))
  limit 1;
$$;
