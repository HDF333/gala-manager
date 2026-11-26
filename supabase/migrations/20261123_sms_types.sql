-- ============================================================================
-- EVEN MANAGER — SMS MANAGER : réglages par événement + journal d'envoi
-- Idempotente.
-- ============================================================================

create table if not exists public.sms_settings (
  event_id bigint primary key references public.events(id) on delete cascade,
  enabled jsonb not null default '{}'::jsonb,
  templates jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.sms_log (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  type text not null,
  guest_id bigint references public.guests(id) on delete set null,
  phone text not null,
  content text not null,
  reference text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'duplicate', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists sms_log_event_idx on public.sms_log (event_id, created_at desc);
create index if not exists sms_log_reference_idx on public.sms_log (reference);

alter table public.sms_settings enable row level security;
alter table public.sms_log enable row level security;

drop policy if exists sms_settings_read on public.sms_settings;
create policy sms_settings_read on public.sms_settings for select
  using (auth.uid() is null or is_admin() or event_id = app_event());

drop policy if exists sms_settings_write on public.sms_settings;
create policy sms_settings_write on public.sms_settings for all to authenticated
  using (is_admin() or event_id = app_event())
  with check (is_admin() or event_id = app_event());

drop policy if exists sms_log_read on public.sms_log;
create policy sms_log_read on public.sms_log for select to authenticated
  using (is_admin() or event_id = app_event());

drop policy if exists sms_log_delete on public.sms_log;
create policy sms_log_delete on public.sms_log for delete to authenticated
  using (is_admin() or event_id = app_event());

-- Journalisation d'un envoi (autorise aussi les inscriptions publiques anonymes)
create or replace function public.log_sms(
  p_event bigint,
  p_type text,
  p_phone text,
  p_content text,
  p_reference text default null,
  p_status text default 'queued',
  p_error text default null,
  p_guest bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.sms_log (event_id, type, guest_id, phone, content, reference, status, error)
  values (p_event, p_type, p_guest, p_phone, left(p_content, 1600), p_reference,
          case when p_status in ('queued', 'sent', 'failed', 'duplicate', 'skipped') then p_status else 'queued' end,
          p_error)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.log_sms(bigint, text, text, text, text, text, text, bigint) to anon, authenticated;

-- Realtime : le journal se met à jour tout seul dans l'interface
do $$
begin
  begin
    alter publication supabase_realtime add table public.sms_log;
  exception when duplicate_object then null;
  end;
end $$;
