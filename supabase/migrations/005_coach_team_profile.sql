-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 005: Perfil del Running Team del Coach
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists team_name        text,
  add column if not exists team_logo_path   text,
  add column if not exists team_description text,
  add column if not exists team_location    text;
