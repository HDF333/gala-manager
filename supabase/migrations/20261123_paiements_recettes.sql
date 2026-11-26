-- ============================================================================
-- EVEN MANAGER — Paiements et recettes
--  1. Participant confirmé  =>  son paiement est considéré reçu (paid)
--  2. Types de recette normalisés : « Vente » (inscriptions) / « Manuel »
-- Idempotente.
-- ============================================================================

create or replace function public.guests_payment_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and (tg_op = 'INSERT' or old.status is distinct from 'confirmed') then
    update public.finances
       set status = 'paid'
     where guest_id = new.id
       and status <> 'paid';
  end if;
  return new;
end $$;

drop trigger if exists guests_payment_sync on public.guests;
create trigger guests_payment_sync
  after insert or update of status on public.guests
  for each row execute function public.guests_payment_sync();

-- Libellé des anciennes recettes manuelles conservé dans la référence
update public.finances
   set reference = coalesce(nullif(reference, ''), type)
 where guest_id is null and type <> 'Manuel';

update public.finances set type = 'Manuel' where guest_id is null and type <> 'Manuel';
update public.finances set type = 'Vente' where guest_id is not null and type <> 'Vente';

-- Rattrapage : tout participant déjà confirmé a payé
update public.finances f
   set status = 'paid'
  from public.guests g
 where f.guest_id = g.id
   and g.status = 'confirmed'
   and f.status <> 'paid';

create index if not exists finances_event_status_idx on public.finances (event_id, status);
create index if not exists finances_guest_idx on public.finances (guest_id);
