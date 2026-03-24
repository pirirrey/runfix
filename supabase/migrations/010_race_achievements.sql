-- Logros de carrera del runner
create table public.race_achievements (
  id                uuid primary key default gen_random_uuid(),
  runner_id         uuid not null references public.profiles(id) on delete cascade,
  goal_id           uuid references public.runner_event_goals(id) on delete set null,
  event_id          uuid references public.race_events(id) on delete set null,
  race_name         text not null,
  race_date         date not null,
  distance_label    text,
  finish_time       text,              -- "3:45:22"
  position_general  integer,
  total_general     integer,
  position_category integer,
  total_category    integer,
  category_name     text,             -- "M35-39", "F40-44", etc.
  certificate_path  text,
  photo_path        text,
  notes             text,
  created_at        timestamptz not null default now()
);

alter table public.race_achievements enable row level security;

create policy "Runner gestiona sus logros"
  on public.race_achievements for all
  using  (auth.uid() = runner_id)
  with check (auth.uid() = runner_id);

grant all on public.race_achievements to authenticated;
grant all on public.race_achievements to service_role;

-- Vincular objetivo al logro cuando se convierte
alter table public.runner_event_goals
  add column if not exists achievement_id uuid
  references public.race_achievements(id) on delete set null;
