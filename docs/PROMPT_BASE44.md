# PROMPT COMPLET — EVEN MANAGER (à envoyer à Base44)

Tu es un développeur senior. Crée une application web complète et fonctionnelle nommée **EVEN MANAGER** : une plateforme de gestion d'événements (dîners de gala, soirées, conférences) multi-événements, en français, avec un thème sombre noir et or.

## Stack technique
- React 19 + Vite, react-router-dom v6, @supabase/supabase-js v2, bibliothèque `qrcode`, tests Vitest + Testing Library.
- Backend : Supabase (PostgreSQL, Auth, Realtime, RLS).
- Base de données : schéma ci-dessous, avec **Row Level Security (RLS)** activé sur TOUTES les tables.

## Schéma SQL (PostgreSQL)

```sql
create table public.events (
  id bigint generated always as identity primary key,
  name text not null,
  date date,
  venue text,
  tables_count bigint not null default 100,      -- tables max PAR catégorie
  seats_per_table bigint not null default 10,    -- places par table
  budget_recettes bigint,
  budget_depenses bigint,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  code text not null,
  name text not null,
  price bigint not null default 0,               -- FCFA
  seats bigint not null default 1,               -- 1 = seul, 2 = couple
  admin_only boolean not null default false,     -- catégorie attribuée uniquement par l'admin
  event_id bigint references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tables_placement (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  capacity bigint not null default 10,
  status text not null default 'available',
  event_id bigint references public.events(id) on delete cascade,
  category_id bigint references public.categories(id) on delete set null,
  number bigint,                                 -- n°001, 002... PAR catégorie
  created_at timestamptz not null default now()
);

create table public.guests (
  id bigint generated always as identity primary key,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  company text,                                  -- "Tribu"
  category_id bigint references public.categories(id) on delete set null,
  status text not null default 'pending',        -- pending | confirmed | rejected | cancelled
  total bigint not null default 0,
  confirmation_date timestamptz,
  notes text,
  people_count bigint not null default 1,        -- 2 pour un couple
  table_number bigint references public.tables_placement(id) on delete set null,
  event_id bigint references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tickets (
  id bigint generated always as identity primary key,
  ticket_code text not null unique,
  category_id bigint references public.categories(id) on delete set null,
  quantity bigint not null default 1,
  total bigint not null default 0,
  status text not null default 'active',         -- pending | active | used | redeemed
  purchased_at timestamptz not null default now(),
  buyer_id bigint references public.guests(id) on delete set null,
  event_id bigint references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qrcodes (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.tickets(id) on delete cascade,
  code text not null,
  data jsonb not null default '{}',              -- contient imageUrl (PNG data URL)
  status text not null default 'confirmed',
  generated_at timestamptz not null default now(),
  event_id bigint references public.events(id) on delete cascade
);

create table public.program_items (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  title text not null,
  start_time text,
  description text,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.committee_members (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  full_name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  description text not null,
  vendor text,
  amount bigint not null default 0,
  status text not null default 'paid',           -- paid | pending
  expense_date date default now(),
  created_at timestamptz not null default now()
);

create table public.finances (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  type text not null,                            -- Sponsor, Dons, Vente...
  amount bigint not null default 0,
  status text not null default 'paid',           -- paid | pending
  payment_date date default now(),
  created_at timestamptz not null default now()
);
```

Index : unique partiel sur `categories.code where status='active'`, unique sur `tickets.ticket_code`, index sur les statuts de guests/tickets/qrcodes.

## RLS — règles de sécurité (obligatoires)

Activer RLS sur toutes les tables puis :

**Lecture publique (anon + authenticated)** :
- `events` : SELECT pour tous.
- `categories` : SELECT pour tous.
- `tables_placement` : SELECT pour tous.
- `guests` : SELECT anon uniquement `status='confirmed'` ; SELECT authenticated = tous.
- `tickets` : SELECT uniquement `status in ('active','confirmed')`.
- `qrcodes` : SELECT uniquement `status='confirmed'`.
- `program_items`, `committee_members`, `expenses`, `finances` : SELECT pour tous.

**Écriture** :
- `categories` : INSERT anon refusé ; INSERT/UPDATE/DELETE `to authenticated` uniquement.
- `guests` : INSERT anon autorisé UNIQUEMENT avec `status='pending'` (inscription publique) ; INSERT authenticated avec `status='pending'` ; UPDATE/DELETE `to authenticated`.
- `tickets` : INSERT tous rôles ; UPDATE/DELETE `to authenticated`.
- `qrcodes` : INSERT tous rôles ; DELETE `to authenticated`.
- `events`, `tables_placement`, `program_items`, `committee_members`, `expenses`, `finances` : écritures `to authenticated` uniquement.

## Fonctions RPC (SECURITY DEFINER, avec GRANT EXECUTE)

1. `create_event(p_name text, p_date date, p_venue text, p_tables_count bigint, p_seats_per_table bigint, p_budget_recettes bigint, p_budget_depenses bigint) returns bigint`
   → crée l'événement + insère automatiquement 5 catégories standard (`Invité` 0 FCFA admin_only, `Premium Seul` 150000, `Premium Couple` 300000/2 pers., `VIP Seul` 500000, `VIP Couple` 1000000/2 pers.) + retourne l'id.

2. `assign_table(p_people bigint, p_event bigint, p_category bigint) returns jsonb {id, number}`
   → cherche la première table de CETTE catégorie et CET événement avec assez de places (somme des `people_count` des invités affectés) ; sinon crée la table suivante de la catégorie (n°001, 002...) si la limite `tables_count` n'est pas atteinte ; retourne null si complet. **Deux catégories ne partagent jamais une table.**

3. `activate_tickets_for_guest(p_buyer bigint) returns void`
   → passe les billets `pending` de l'invité en `active`.

## Authentification
- Supabase Auth email/mot de passe. Page de connexion (email, mot de passe, erreurs affichées dont "invalid credentials").
- Restauration de session au rechargement (`getSession` + `onAuthStateChange`), déconnexion réelle (`signOut({scope:'local'})`).
- **Route publique** `/inscription-publique?event=ID` accessible SANS connexion pour l'inscription (RLS anon gérée).

## Pages et fonctionnalités

**Événements** (nav) : liste des événements (nom, date, lieu, tables max/catégorie, places/table, budgets) ; création avec formulaire complet (nom*, date, lieu, tables max par catégorie, places par table, budget recettes, budget dépenses) ; modifier ; supprimer (avec cascade) ; bouton « Utiliser » pour activer un événement (mémorisé en localStorage, défaut = premier événement). **Toutes les autres pages n'affichent et ne modifient que les données de l'événement actif.**

**Tableau de bord** : KPI en temps réel — recettes encaissées (billets actifs+confirmés), recettes en attente, invités confirmés/en attente, occupation des tables (%), mesures clés réelles. Aucun contenu statique hors sujet.

**Invités** : liste avec recherche ; ajout ; **Modifier** (modale) et **Supprimer** sur chaque ligne ; colonne Tribu, Table (n°), Personnes ; export CSV.

**Billets** : chaque catégorie correspond à un billet ; ajout (catégorie, quantité, prix auto = prix catégorie), Modifier/Supprimer par ligne, export CSV, totaux réels.

**Inscription** (interne et publique) : formulaire Prénom*, Nom*, Email, Téléphone, **Tribu**, Catégorie* (hors catégories admin_only), Notes ; à la soumission → **attribution automatique de table par catégorie** (ordre d'inscription, tables remplies avant la suivante) + **création automatique du billet** au prix de la catégorie ; message de succès « Table attribuée : <Catégorie> n°001 » ; bouton « Copier le lien d'inscription publique ».

**Administration** : liste des inscriptions avec filtres (recherche, catégorie, statut) ; colonnes Personnes et Table ; **Valider** (passe l'invité `confirmed` + active son billet via RPC) / **Rejeter** ; gestion des **catégories** : ajouter/modifier/supprimer avec nom, prix FCFA, personnes (1 ou 2/couple), « réservé admin » ; suppression des QR.

**Tables** : groupées **par catégorie** (Invité, Premium Seul...), chaque catégorie listant ses tables n°001, 002... avec statut Disponible/Occupée/Complète, invités et places.

**QR Codes** : sélection d'un billet en attente → génération d'un **vrai QR PNG** (librairie `qrcode`, données JSON du billet) stocké dans `qrcodes.data.imageUrl` ; tableau avec aperçu du QR, téléchargement PNG, suppression.

**Recettes** : budget recettes de l'événement ; KPI (encaissé = billets + manuel, dont billets, en attente) ; CRUD des recettes manuelles (type, montant, statut encaissé/en attente, date).

**Dépenses** : budget dépenses ; KPI (budget, payé, en attente, % consommé) ; CRUD (description, fournisseur, montant, statut, date).

**Programme** : CRUD (titre, heure, description), tri par heure.

**Comité** : CRUD (nom complet, rôle, email, téléphone).

**Rapports, Sponsors, Contrôle d'accès** : pages de démonstration cohérentes (aucune donnée logistique étrangère au thème).

**404** : page introuvable avec retour au tableau de bord.

## Design
Thème sombre : fond #0a0a0a, cartes #1a1a1a, bordures #2a2a2a, or #d4af37 (dégradé #d4af37→#b8941f), texte #ffffff/#a0a0a0. Sidebar fixe 260px avec logo ⚜️ et « EVEN MANAGER », menu avec icônes emoji, état actif doré, pied avec utilisateur + déconnexion. Responsive (menu mobile ☰). Toute l'interface en **français**.

## Qualité
- Tests unitaires (connexion, restauration de session, refus d'un faux utilisateur local, déconnexion, inscription, validation, rendu des routes, hook Supabase).
- Gestion d'erreurs affichées à l'utilisateur, états de chargement, aucune clé exposée côté client autre que la clé anon Supabase.
- Build `npm run build` sans erreur.
