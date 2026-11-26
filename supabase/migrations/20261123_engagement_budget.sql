-- ============================================================================
-- EVEN MANAGER — Sponsors (engagement) et budget prévisionnel
-- Idempotente.
-- ============================================================================

-- 1. « dépôt » devient « engagement »
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sponsors' and column_name = 'deposit'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sponsors' and column_name = 'engagement'
  ) then
    alter table public.sponsors rename column deposit to engagement;
  end if;
end $$;

-- 2. Reste à verser = engagement - payé (colonne calculée)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sponsors' and column_name = 'due'
      and is_generated = 'NEVER'
  ) then
    alter table public.sponsors drop column due;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sponsors' and column_name = 'due'
  ) then
    alter table public.sponsors
      add column due bigint generated always as (coalesce(engagement, 0) - coalesce(paid, 0)) stored;
  end if;
end $$;

-- 3. Budgets : valeurs par défaut à 0 pour faciliter les comparaisons
update public.events set budget_recettes = 0 where budget_recettes is null;
update public.events set budget_depenses = 0 where budget_depenses is null;
