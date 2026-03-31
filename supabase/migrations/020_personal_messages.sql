-- Agregar runner_id a team_messages para mensajes individuales
-- team_id nullable → mensajes personales no necesitan equipo
ALTER TABLE team_messages
  ADD COLUMN IF NOT EXISTS runner_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ALTER COLUMN team_id DROP NOT NULL;

-- Índice para búsqueda por runner
CREATE INDEX IF NOT EXISTS team_messages_runner_id_idx ON team_messages(runner_id);

-- Actualizar RLS: runner ve mensajes de sus equipos O mensajes personales suyos
DROP POLICY IF EXISTS "runners_see_active_messages" ON team_messages;
CREATE POLICY "runners_see_active_messages" ON team_messages
  FOR SELECT USING (
    auth.uid() = runner_id
    OR (
      team_id IN (
        SELECT team_id FROM team_memberships WHERE runner_id = auth.uid()
      )
      AND runner_id IS NULL
    )
  );

GRANT ALL ON team_messages TO authenticated;
GRANT ALL ON team_messages TO service_role;
