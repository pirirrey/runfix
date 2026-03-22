-- Configuración de planes de pago del coach (a nivel perfil)
alter table public.profiles
  add column if not exists plan_monthly_price   numeric(10,2),
  add column if not exists plan_monthly_due_day integer check (plan_monthly_due_day between 1 and 31),
  add column if not exists plan_annual_price    numeric(10,2);

comment on column public.profiles.plan_monthly_price   is 'Tarifa mensual que cobra el coach';
comment on column public.profiles.plan_monthly_due_day is 'Día del mes en que vence el pago mensual (1-31)';
comment on column public.profiles.plan_annual_price    is 'Tarifa anual que cobra el coach';
