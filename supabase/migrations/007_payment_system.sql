-- Plan de pago que el coach asigna a cada runner
create table public.runner_payment_plans (
  id         uuid primary key default gen_random_uuid(),
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  runner_id  uuid not null references public.profiles(id) on delete cascade,
  plan_type  text not null default 'monthly'
             check (plan_type in ('monthly', 'annual', 'exempt')),
  amount     numeric(10,2),        -- monto opcional
  notes      text,
  updated_at timestamptz not null default now(),
  unique (coach_id, runner_id)
);

-- Comprobantes de pago subidos por el runner
create table public.payment_receipts (
  id            uuid primary key default gen_random_uuid(),
  runner_id     uuid not null references public.profiles(id) on delete cascade,
  coach_id      uuid not null references public.profiles(id) on delete cascade,
  payment_month date not null,       -- primer día del mes que se está pagando
  payment_date  date not null,       -- fecha real del pago
  method        text not null check (method in ('transfer', 'cash', 'other')),
  storage_path  text,                -- null si fue en efectivo
  file_name     text,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (runner_id, coach_id, payment_month)
);

-- RLS
alter table public.runner_payment_plans enable row level security;
alter table public.payment_receipts      enable row level security;

-- Coach: CRUD sobre sus planes
create policy "Coach gestiona planes de pago"
  on public.runner_payment_plans for all
  using  (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- Runner: puede leer su propio plan
create policy "Runner ve su plan de pago"
  on public.runner_payment_plans for select
  using (auth.uid() = runner_id);

-- Runner: CRUD sobre sus propios comprobantes
create policy "Runner gestiona sus comprobantes"
  on public.payment_receipts for all
  using  (auth.uid() = runner_id)
  with check (auth.uid() = runner_id);

-- Coach: puede leer comprobantes de sus runners
create policy "Coach ve comprobantes de sus runners"
  on public.payment_receipts for select
  using (
    exists (
      select 1 from public.coach_runners cr
      where cr.coach_id = auth.uid()
        and cr.runner_id = payment_receipts.runner_id
    )
  );
