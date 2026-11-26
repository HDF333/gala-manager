-- ============================================================================
-- EVEN MANAGER — Programme consultable sans connexion (QR partagé)
-- Idempotente.
-- ============================================================================

drop policy if exists program_select on public.program_items;
create policy program_select on public.program_items for select
  using ((auth.uid() is null) or is_admin() or event_id = app_event());
