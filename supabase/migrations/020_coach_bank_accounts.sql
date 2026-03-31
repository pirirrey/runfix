-- Migración 020: Cuentas bancarias del coach (múltiples por coach)
-- (reemplaza el intento anterior de campos en profiles)

CREATE TABLE IF NOT EXISTS coach_bank_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_name   text NOT NULL,
  holder      text,
  cbu         text,
  alias       text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coach_bank_accounts_coach_id_idx ON coach_bank_accounts(coach_id);

ALTER TABLE coach_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Coach: gestiona sus propias cuentas
CREATE POLICY "coach_manage_own_bank_accounts"
  ON coach_bank_accounts FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Runner: puede ver cuentas de coaches con los que está asociado
CREATE POLICY "runner_view_coach_bank_accounts"
  ON coach_bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_runners cr
      WHERE cr.coach_id = coach_bank_accounts.coach_id
        AND cr.runner_id = auth.uid()
        AND cr.suspended = false
    )
  );

GRANT ALL ON coach_bank_accounts TO authenticated;
GRANT ALL ON coach_bank_accounts TO service_role;
