-- Mensajes del coach al grupo (por equipo)
create table if not exists team_messages (
  id         uuid default gen_random_uuid() primary key,
  team_id    uuid references teams(id)    on delete cascade not null,
  coach_id   uuid references profiles(id) on delete cascade not null,
  message    text not null,
  expires_at date not null,
  created_at timestamptz default now()
);

alter table team_messages enable row level security;

-- Coach gestiona sus propios mensajes
create policy "coach_manage_own_messages" on team_messages
  for all to authenticated
  using  (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Runner ve mensajes activos de los equipos a los que pertenece
create policy "runner_view_team_messages" on team_messages
  for select to authenticated
  using (
    expires_at >= current_date
    and team_id in (
      select team_id from team_memberships where runner_id = auth.uid()
    )
  );

grant all on team_messages to authenticated;
grant all on team_messages to service_role;
