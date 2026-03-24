-- Flags opcionales para modalidades de pago del coach
alter table profiles
  add column if not exists plan_annual_enabled boolean not null default false,
  add column if not exists plan_exempt_enabled boolean not null default false;
