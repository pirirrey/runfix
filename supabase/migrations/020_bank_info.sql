-- Migración 020: Datos bancarios del coach en profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_name        text,
  ADD COLUMN IF NOT EXISTS bank_holder      text,
  ADD COLUMN IF NOT EXISTS bank_cbu         text,
  ADD COLUMN IF NOT EXISTS bank_alias       text;
