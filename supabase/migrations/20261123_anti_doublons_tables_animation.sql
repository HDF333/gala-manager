-- ============================================================================
-- EVEN MANAGER — Migration 2026-11-23
--  1. Anti-doublons des inscrits (clé téléphone > email > nom, par événement)
--  2. Tables : numérotation globale unique par événement + capacité sérialisée
--  3. Module d'animation : quiz, vote des distinctions, tombola, classement
-- Idempotente : peut être relancée sans casser l'existant.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ANTI-DOUBLONS
-- ---------------------------------------------------------------------------

-- Numéro canonique : chiffres seuls, sans indicatif 225 ni zéros de tête
create or replace function public.phone_key(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'),
        '^225', ''),
      '^0+', ''),
    '');
$$;

create or replace function public.guest_dedupe_key(p_first text, p_last text, p_email text, p_phone text)
returns text
language sql
immutable
as $$
  select coalesce(
    case when public.phone_key(p_phone) is not null then 'p:' || public.phone_key(p_phone) end,
    case when nullif(lower(btrim(coalesce(p_email, ''))), '') is not null
         then 'e:' || lower(btrim(coalesce(p_email, ''))) end,
    'n:' || lower(btrim(coalesce(p_first, ''))) || '|' || lower(btrim(coalesce(p_last, '')))
  )
$$;

-- Fusion des doublons existants (on garde la fiche confirmée la plus ancienne)
do $$
declare
  r record;
  keeper bigint;
begin
  for r in
    select event_id,
           public.guest_dedupe_key(first_name, last_name, email, phone) as k,
           array_agg(id order by (status = 'confirmed') desc, id) as ids
    from public.guests
    where status <> 'cancelled'
    group by 1, 2
    having count(*) > 1
  loop
    keeper := r.ids[1];
    update public.tickets set buyer_id = keeper where buyer_id = any (r.ids[2:]);
    update public.finances set guest_id = keeper where guest_id = any (r.ids[2:]);
    delete from public.guests where id = any (r.ids[2:]);
    raise notice 'Doublons fusionnés % -> %', r.ids, keeper;
  end loop;
end $$;

drop index if exists public.guests_dedupe_uidx;
create unique index guests_dedupe_uidx
  on public.guests (event_id, public.guest_dedupe_key(first_name, last_name, email, phone))
  where status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- 2. TABLES : NUMÉROTATION GLOBALE + CAPACITÉ
-- ---------------------------------------------------------------------------

-- Renumérotation globale par événement (n°001, 002, ... sans doublon)
update public.tables_placement set number = number + 1000000;

with ranked as (
  select id,
         row_number() over (partition by event_id order by category_id nulls last, number, id) as rn
  from public.tables_placement
)
update public.tables_placement t
set number = r.rn,
    code = 'T' || t.event_id || '-' || r.rn,
    name = 'Table ' || r.rn
from ranked r
where t.id = r.id;

create unique index if not exists tables_event_number_uidx
  on public.tables_placement (event_id, number);

-- Attribution atomique : verrou par événement, capacité réelle, numéro global
create or replace function public.assign_table(p_people bigint, p_event bigint, p_category bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity bigint;
  v_max_tables bigint;
  v_people bigint := greatest(coalesce(p_people, 1), 1);
  v_next bigint;
  t_id bigint;
begin
  if p_event is null then
    raise exception 'Événement manquant';
  end if;

  -- sérialise les attributions concurrentes du même événement
  perform pg_advisory_xact_lock(hashtext('assign_table:' || p_event::text));

  select coalesce(seats_per_table, 10), coalesce(tables_count, 100)
    into v_capacity, v_max_tables
  from public.events where id = p_event;

  if v_capacity is null then
    raise exception 'Événement % introuvable', p_event;
  end if;

  select tp.id into t_id
  from public.tables_placement tp
  where tp.event_id = p_event
    and tp.category_id = p_category
    and coalesce((
          select sum(g.people_count) from public.guests g
          where g.table_number = tp.id and g.status <> 'cancelled'
        ), 0) + v_people <= tp.capacity
  order by tp.number, tp.id
  limit 1;

  if t_id is not null then
    return jsonb_build_object('id', t_id, 'number', (select number from public.tables_placement where id = t_id));
  end if;

  if (select count(*) from public.tables_placement
      where event_id = p_event and category_id = p_category) >= v_max_tables then
    return null;
  end if;

  select coalesce(max(number), 0) + 1 into v_next
  from public.tables_placement where event_id = p_event;

  insert into public.tables_placement (code, name, capacity, event_id, category_id, number, status)
  values ('T' || p_event || '-' || v_next, 'Table ' || v_next, v_capacity, p_event, p_category, v_next, 'available')
  returning id into t_id;

  return jsonb_build_object('id', t_id, 'number', v_next);
end $$;

-- Contrôle capacité + synchronisation du nombre de places depuis la catégorie
create or replace function public.guests_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity bigint;
  v_seats bigint;
  v_used bigint;
begin
  if tg_op = 'INSERT' or new.category_id is distinct from old.category_id then
    select seats into v_seats from public.categories where id = new.category_id;
    if v_seats is not null then
      new.people_count := greatest(v_seats, 1);
    end if;
  end if;

  new.people_count := greatest(coalesce(new.people_count, 1), 1);

  if new.table_number is not null then
    select capacity into v_capacity from public.tables_placement where id = new.table_number;
    if v_capacity is null then
      raise exception 'Table % inexistante', new.table_number;
    end if;

    select coalesce(sum(people_count), 0) into v_used
    from public.guests
    where table_number = new.table_number
      and status <> 'cancelled'
      and id is distinct from new.id;

    if v_used + new.people_count > v_capacity then
      raise exception 'Table complète : % places demandées, % déjà occupées sur %',
        new.people_count, v_used, v_capacity
        using hint = 'Choisissez une autre table ou augmentez la capacité.';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists guests_before_write on public.guests;
create trigger guests_before_write
  before insert or update of category_id, people_count, table_number on public.guests
  for each row execute function public.guests_before_write();

-- Inscription : doublon refusé, places = catégorie, table attribuée atomiquement
create or replace function public.register_guest(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event bigint := (p_payload->>'event_id')::bigint;
  v_cat bigint := (p_payload->>'category_id')::bigint;
  v_people bigint;
  v_ptype text := coalesce(nullif(p_payload->>'person_type', ''), 'participant');
  v_cat_name text;
  v_cat_price bigint;
  v_seats bigint;
  v_ev_name text;
  v_first text := btrim(coalesce(p_payload->>'first_name', ''));
  v_last text := btrim(coalesce(p_payload->>'last_name', ''));
  v_email text := nullif(btrim(coalesce(p_payload->>'email', '')), '');
  v_phone text := nullif(btrim(coalesce(p_payload->>'phone', '')), '');
  v_key text;
  v_dup record;
  v_assigned jsonb;
  v_table_id bigint;
  v_table_num bigint;
  v_guest bigint;
  v_ticket bigint;
  v_code text;
begin
  if v_event is null or v_cat is null then
    return jsonb_build_object('ok', false, 'message', 'Événement ou catégorie manquant');
  end if;

  if v_first = '' or v_last = '' then
    return jsonb_build_object('ok', false, 'message', 'Le prénom et le nom sont obligatoires');
  end if;

  select name, price, seats into v_cat_name, v_cat_price, v_seats
  from public.categories where id = v_cat and event_id = v_event;

  if v_cat_name is null then
    return jsonb_build_object('ok', false, 'message', 'Catégorie introuvable pour cet événement');
  end if;

  v_people := greatest(coalesce(v_seats, 1), 1);
  v_key := public.guest_dedupe_key(v_first, v_last, v_email, v_phone);

  select id, first_name, last_name into v_dup
  from public.guests
  where event_id = v_event
    and status <> 'cancelled'
    and public.guest_dedupe_key(first_name, last_name, email, phone) = v_key
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'duplicate', true,
      'message', 'Doublon : ' || v_dup.first_name || ' ' || v_dup.last_name
                 || ' est déjà inscrit(e) pour cet événement (fiche #' || v_dup.id || ').'
    );
  end if;

  select name into v_ev_name from public.events where id = v_event;

  v_assigned := public.assign_table(v_people, v_event, v_cat);
  if v_assigned is null then
    return jsonb_build_object('ok', false, 'message', 'Toutes les tables de cette catégorie sont complètes');
  end if;

  v_table_id := (v_assigned->>'id')::bigint;
  v_table_num := (v_assigned->>'number')::bigint;

  insert into public.guests (first_name, last_name, email, phone, company, category_id, status, notes,
                             people_count, table_number, event_id, person_type)
  values (v_first, v_last, v_email, v_phone, p_payload->>'company', v_cat, 'pending', p_payload->>'notes',
          v_people, v_table_id, v_event, v_ptype)
  returning id into v_guest;

  v_code := 'EVEN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || v_guest;

  insert into public.tickets (ticket_code, category_id, quantity, total, status, buyer_id, event_id)
  values (v_code, v_cat, 1, v_cat_price, 'pending', v_guest, v_event)
  returning id into v_ticket;

  insert into public.qrcodes (ticket_id, code, data, status, event_id)
  values (v_ticket, v_code, jsonb_build_object(
    'code', v_code, 'ticket_code', v_code,
    'first_name', v_first, 'last_name', v_last,
    'email', v_email, 'phone', v_phone, 'tribu', p_payload->>'company',
    'category', v_cat_name, 'category_id', v_cat, 'people_count', v_people,
    'person_type', v_ptype,
    'table_number', v_table_num,
    'table_code', (select code from public.tables_placement where id = v_table_id),
    'event_name', v_ev_name, 'event_id', v_event,
    'status', 'pending', 'imageUrl', p_payload->>'image_url'
  ), 'pending', v_event);

  insert into public.finances (event_id, type, amount, status, payment_date, reference, qr_code, ticket_code, guest_id)
  values (v_event, 'Vente', v_cat_price, 'pending', now(),
          'Inscription ' || v_guest || ' — ' || v_cat_name, v_code, v_code, v_guest);

  return jsonb_build_object('ok', true, 'guest_id', v_guest, 'ticket_code', v_code,
                            'table_number', v_table_num, 'table_id', v_table_id,
                            'category', v_cat_name, 'people_count', v_people,
                            'person_type', v_ptype, 'imageUrl', p_payload->>'image_url');
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'duplicate', true,
      'message', 'Ce participant est déjà inscrit pour cet événement.');
end $$;

-- ---------------------------------------------------------------------------
-- 3. MODULE D'ANIMATION
-- ---------------------------------------------------------------------------

create table if not exists public.animations (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('quiz', 'vote', 'tombola')),
  title text not null,
  description text,
  prize text,
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.animation_questions (
  id bigint generated always as identity primary key,
  animation_id bigint not null references public.animations(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer,
  points integer not null default 10,
  duration_seconds integer not null default 30,
  status text not null default 'draft' check (status in ('draft', 'live', 'closed')),
  sort_order integer not null default 0,
  started_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.animation_players (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  full_name text not null,
  phone text not null,
  phone_key text generated always as (public.phone_key(phone)) stored,
  guest_id bigint references public.guests(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, phone_key)
);

-- normalisation du téléphone (migration idempotente)
alter table public.animation_players drop constraint if exists animation_players_event_id_phone_key_key;
alter table public.animation_players drop column if exists phone_key;
alter table public.animation_players
  add column phone_key text generated always as (public.phone_key(phone)) stored;
alter table public.animation_players
  add constraint animation_players_event_id_phone_key_key unique (event_id, phone_key);

create table if not exists public.animation_answers (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  question_id bigint not null references public.animation_questions(id) on delete cascade,
  player_id bigint not null references public.animation_players(id) on delete cascade,
  choice_index integer not null,
  is_correct boolean not null default false,
  points integer not null default 0,
  answered_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create table if not exists public.animation_candidates (
  id bigint generated always as identity primary key,
  animation_id bigint not null references public.animations(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.animation_votes (
  id bigint generated always as identity primary key,
  animation_id bigint not null references public.animations(id) on delete cascade,
  candidate_id bigint not null references public.animation_candidates(id) on delete cascade,
  player_id bigint not null references public.animation_players(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (animation_id, player_id)
);

create table if not exists public.animation_entries (
  id bigint generated always as identity primary key,
  animation_id bigint not null references public.animations(id) on delete cascade,
  player_id bigint not null references public.animation_players(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (animation_id, player_id)
);

create table if not exists public.animation_draws (
  id bigint generated always as identity primary key,
  animation_id bigint not null references public.animations(id) on delete cascade,
  player_id bigint not null references public.animation_players(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  prize text,
  drawn_by uuid,
  drawn_at timestamptz not null default now()
);

create index if not exists animation_answers_player_idx on public.animation_answers (player_id);
create index if not exists animation_votes_candidate_idx on public.animation_votes (candidate_id);
create index if not exists animation_players_event_idx on public.animation_players (event_id);
create index if not exists animations_event_idx on public.animations (event_id, kind);

-- RLS
alter table public.animations enable row level security;
alter table public.animation_questions enable row level security;
alter table public.animation_players enable row level security;
alter table public.animation_answers enable row level security;
alter table public.animation_candidates enable row level security;
alter table public.animation_votes enable row level security;
alter table public.animation_entries enable row level security;
alter table public.animation_draws enable row level security;

drop policy if exists animations_read on public.animations;
create policy animations_read on public.animations for select
  using (auth.uid() is null or is_admin() or event_id = app_event());
drop policy if exists animations_write on public.animations;
create policy animations_write on public.animations for all to authenticated
  using (is_admin() or event_id = app_event())
  with check (is_admin() or event_id = app_event());

drop policy if exists animation_questions_read on public.animation_questions;
create policy animation_questions_read on public.animation_questions for select
  using (auth.uid() is null or is_admin() or event_id = app_event());
drop policy if exists animation_questions_write on public.animation_questions;
create policy animation_questions_write on public.animation_questions for all to authenticated
  using (is_admin() or event_id = app_event())
  with check (is_admin() or event_id = app_event());

drop policy if exists animation_players_read on public.animation_players;
create policy animation_players_read on public.animation_players for select to authenticated
  using (is_admin() or event_id = app_event());
drop policy if exists animation_players_delete on public.animation_players;
create policy animation_players_delete on public.animation_players for delete to authenticated
  using (is_admin() or event_id = app_event());

drop policy if exists animation_answers_read on public.animation_answers;
create policy animation_answers_read on public.animation_answers for select to authenticated
  using (is_admin() or event_id = app_event());

drop policy if exists animation_candidates_read on public.animation_candidates;
create policy animation_candidates_read on public.animation_candidates for select
  using (auth.uid() is null or is_admin() or event_id = app_event());
drop policy if exists animation_candidates_write on public.animation_candidates;
create policy animation_candidates_write on public.animation_candidates for all to authenticated
  using (is_admin() or event_id = app_event())
  with check (is_admin() or event_id = app_event());

drop policy if exists animation_votes_read on public.animation_votes;
create policy animation_votes_read on public.animation_votes for select
  using (auth.uid() is null or is_admin() or event_id = app_event());

drop policy if exists animation_entries_read on public.animation_entries;
create policy animation_entries_read on public.animation_entries for select to authenticated
  using (is_admin() or event_id = app_event());

drop policy if exists animation_draws_read on public.animation_draws;
create policy animation_draws_read on public.animation_draws for select
  using (auth.uid() is null or is_admin() or event_id = app_event());

-- Suppression réservée à l'organisation (nettoyage, reset d'une animation)
do $$
declare t text;
begin
  foreach t in array array['animation_questions', 'animation_candidates', 'animation_answers',
                           'animation_votes', 'animation_entries', 'animation_draws']
  loop
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated
                    using (is_admin() or event_id = app_event())', t, t);
  end loop;
end $$;

-- Realtime (live sur les téléphones)
do $$
declare t text;
begin
  foreach t in array array['animations','animation_questions','animation_candidates',
                           'animation_answers','animation_votes','animation_entries',
                           'animation_draws','animation_players','guests','tables_placement']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Inscription d'un joueur (nom + téléphone) au module d'animation
create or replace function public.animation_join(p_event bigint, p_name text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := btrim(coalesce(p_phone, ''));
  v_key text := public.phone_key(p_phone);
  v_player bigint;
  v_guest bigint;
begin
  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'message', 'Indiquez votre nom complet.');
  end if;
  if length(v_key) < 6 then
    return jsonb_build_object('ok', false, 'message', 'Numéro de téléphone invalide.');
  end if;

  select id into v_guest from public.guests
  where event_id = p_event
    and status <> 'cancelled'
    and public.phone_key(phone) = v_key
  limit 1;

  insert into public.animation_players (event_id, full_name, phone, guest_id)
  values (p_event, v_name, v_phone, v_guest)
  on conflict (event_id, phone_key) do update
    set full_name = excluded.full_name,
        guest_id = coalesce(excluded.guest_id, public.animation_players.guest_id)
  returning id into v_player;

  return jsonb_build_object('ok', true, 'player_id', v_player, 'full_name', v_name);
end $$;

-- État complet pour le téléphone du participant
create or replace function public.animation_state(p_event bigint, p_player bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz jsonb;
  v_vote jsonb;
  v_tombola jsonb;
  v_ranking jsonb;
  q record;
  v_total bigint;
begin
  select * into q from public.animation_questions
  where event_id = p_event and status = 'live'
  order by started_at desc nulls last, id desc
  limit 1;

  if found then
    select count(*) into v_total from public.animation_answers where question_id = q.id;
    v_quiz := jsonb_build_object(
      'id', q.id, 'prompt', q.prompt, 'options', q.options, 'points', q.points,
      'duration_seconds', q.duration_seconds, 'started_at', q.started_at,
      'answers_count', v_total,
      'my_choice', (select choice_index from public.animation_answers
                    where question_id = q.id and player_id = p_player)
    );
  end if;

  v_vote := coalesce((
    select jsonb_agg(jsonb_build_object(
             'animation_id', a.id, 'title', a.title, 'description', a.description,
             'candidates', coalesce((
                select jsonb_agg(jsonb_build_object(
                         'id', c.id, 'name', c.name, 'description', c.description,
                         'photo_url', c.photo_url,
                         'votes', (select count(*) from public.animation_votes v where v.candidate_id = c.id))
                       order by c.sort_order, c.id)
                from public.animation_candidates c where c.animation_id = a.id), '[]'::jsonb),
             'my_vote', (select candidate_id from public.animation_votes v
                         where v.animation_id = a.id and v.player_id = p_player)
           ) order by a.sort_order, a.id)
    from public.animations a
    where a.event_id = p_event and a.kind = 'vote' and a.status = 'live'
  ), '[]'::jsonb);

  v_tombola := coalesce((
    select jsonb_agg(jsonb_build_object(
             'animation_id', a.id, 'title', a.title, 'prize', a.prize,
             'entries', (select count(*) from public.animation_entries e where e.animation_id = a.id),
             'entered', exists (select 1 from public.animation_entries e
                                where e.animation_id = a.id and e.player_id = p_player),
             'last_draw', (select jsonb_build_object('name', p.full_name, 'prize', d.prize, 'at', d.drawn_at)
                           from public.animation_draws d
                           join public.animation_players p on p.id = d.player_id
                           where d.animation_id = a.id
                           order by d.drawn_at desc limit 1)
           ) order by a.sort_order, a.id)
    from public.animations a
    where a.event_id = p_event and a.kind = 'tombola' and a.status <> 'draft'
  ), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('player_id', r.player_id, 'name', r.full_name,
                                               'points', r.points, 'answers', r.answers, 'correct', r.correct)
                            order by r.points desc, r.correct desc, r.player_id), '[]'::jsonb)
    into v_ranking
  from (
    select pl.id as player_id, pl.full_name,
           coalesce(sum(ans.points), 0) as points,
           count(ans.id) as answers,
           count(ans.id) filter (where ans.is_correct) as correct
    from public.animation_players pl
    left join public.animation_answers ans on ans.player_id = pl.id and ans.event_id = p_event
    where pl.event_id = p_event
    group by pl.id, pl.full_name
  ) r;

  return jsonb_build_object(
    'quiz', v_quiz,
    'votes', v_vote,
    'tombola', v_tombola,
    'ranking', v_ranking
  );
end $$;

-- Réponse à une question (une seule fois, points si correcte)
create or replace function public.animation_answer(p_player bigint, p_question bigint, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  v_player_event bigint;
  v_correct boolean := false;
  v_points integer := 0;
begin
  select event_id into v_player_event from public.animation_players where id = p_player;
  if v_player_event is null then
    return jsonb_build_object('ok', false, 'message', 'Participant inconnu. Rejoignez l’animation.');
  end if;

  select * into q from public.animation_questions where id = p_question;
  if not found or q.status <> 'live' or q.event_id <> v_player_event then
    return jsonb_build_object('ok', false, 'message', 'Cette question n’est pas ouverte.');
  end if;

  if exists (select 1 from public.animation_answers where question_id = p_question and player_id = p_player) then
    return jsonb_build_object('ok', false, 'message', 'Vous avez déjà répondu à cette question.');
  end if;

  v_correct := (p_choice is not null and p_choice = q.correct_index);
  v_points := case when v_correct then q.points else 0 end;

  insert into public.animation_answers (event_id, question_id, player_id, choice_index, is_correct, points)
  values (q.event_id, p_question, p_player, coalesce(p_choice, -1), v_correct, v_points);

  return jsonb_build_object('ok', true, 'correct', v_correct, 'points', v_points,
                            'correct_index', q.correct_index);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'message', 'Vous avez déjà répondu à cette question.');
end $$;

-- Vote pour un candidat (un seul vote par animation)
create or replace function public.animation_vote(p_player bigint, p_candidate bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  a record;
  v_player_event bigint;
begin
  select event_id into v_player_event from public.animation_players where id = p_player;
  if v_player_event is null then
    return jsonb_build_object('ok', false, 'message', 'Participant inconnu.');
  end if;

  select * into c from public.animation_candidates where id = p_candidate;
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Candidat introuvable.');
  end if;

  select * into a from public.animations where id = c.animation_id;
  if a.status <> 'live' or a.event_id <> v_player_event then
    return jsonb_build_object('ok', false, 'message', 'Ce vote n’est pas ouvert.');
  end if;

  insert into public.animation_votes (animation_id, candidate_id, player_id, event_id)
  values (a.id, c.id, p_player, a.event_id)
  on conflict (animation_id, player_id) do update set candidate_id = excluded.candidate_id;

  return jsonb_build_object('ok', true, 'message', 'Vote enregistré pour ' || c.name);
end $$;

-- Participation à une tombola
create or replace function public.animation_enter(p_player bigint, p_animation bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_player_event bigint;
begin
  select event_id into v_player_event from public.animation_players where id = p_player;
  if v_player_event is null then
    return jsonb_build_object('ok', false, 'message', 'Participant inconnu.');
  end if;

  select * into a from public.animations where id = p_animation;
  if not found or a.kind <> 'tombola' or a.status = 'draft' or a.event_id <> v_player_event then
    return jsonb_build_object('ok', false, 'message', 'Cette tombola n’est pas ouverte.');
  end if;

  insert into public.animation_entries (animation_id, player_id, event_id)
  values (a.id, p_player, a.event_id)
  on conflict (animation_id, player_id) do nothing;

  return jsonb_build_object('ok', true, 'message', 'Vous participez à la tombola !');
end $$;

-- Tirage au sort (organisation uniquement)
create or replace function public.animation_draw(p_animation bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_winner record;
begin
  if not (coalesce(public.is_admin(), false) or coalesce(public.app_role(), '') in ('Administrateur', 'Gestionnaire')) then
    return jsonb_build_object('ok', false, 'message', 'Tirage réservé à l’organisation.');
  end if;

  select * into a from public.animations where id = p_animation;
  if not found or a.kind <> 'tombola' then
    return jsonb_build_object('ok', false, 'message', 'Tombola introuvable.');
  end if;

  select p.id, p.full_name into v_winner
  from public.animation_entries e
  join public.animation_players p on p.id = e.player_id
  where e.animation_id = p_animation
  order by random()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Aucun participant inscrit à cette tombola.');
  end if;

  insert into public.animation_draws (animation_id, player_id, event_id, prize, drawn_by)
  values (a.id, v_winner.id, a.event_id, a.prize, auth.uid());

  return jsonb_build_object('ok', true, 'player_id', v_winner.id, 'name', v_winner.full_name, 'prize', a.prize);
end $$;

grant execute on function public.animation_join(bigint, text, text) to anon, authenticated;
grant execute on function public.animation_state(bigint, bigint) to anon, authenticated;
grant execute on function public.animation_answer(bigint, bigint, integer) to anon, authenticated;
grant execute on function public.animation_vote(bigint, bigint) to anon, authenticated;
grant execute on function public.animation_enter(bigint, bigint) to anon, authenticated;
revoke all on function public.animation_draw(bigint) from public, anon;
grant execute on function public.animation_draw(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. VUES UTILES
-- ---------------------------------------------------------------------------

create or replace view public.animation_ranking as
select pl.event_id,
       pl.id as player_id,
       pl.full_name,
       coalesce(sum(ans.points), 0) as points,
       count(ans.id) as answers,
       count(ans.id) filter (where ans.is_correct) as correct
from public.animation_players pl
left join public.animation_answers ans on ans.player_id = pl.id
group by pl.event_id, pl.id, pl.full_name;

grant select on public.animation_ranking to authenticated;
