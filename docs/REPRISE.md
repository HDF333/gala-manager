# EVEN MANAGER — état du projet (multi-événements)

## 2026-11-23 — Utilisateurs et contrôle d'accès par événement

- Menu **Utilisateurs** : liste filtrée sur l'événement actif (les comptes globaux « Tous événements » restent visibles), bascule « Cet événement / Tous », création rattachée par défaut à l'événement actif.
- Menu **Contrôle d'accès** : journal et statistiques filtrés sur l'événement actif (`access_logs` ajouté aux tables filtrées par événement), nom de l'événement affiché.
- La séparation reste garantie en base pour les rôles non administrateurs via les politiques RLS (`event_id = app_event()`).

## 2026-11-23 — Sponsors, budget, dépenses, programme

- **Sponsors** : « dépôt » devient **Engagement** ; le **Reste à verser** est une colonne calculée (engagement − payé), plus de saisie manuelle ; KPI + taux de recouvrement.
- **Menu Budget** : saisie du budget recettes et du budget dépenses, écrits sur `events` — donc synchronisés avec « Budget recettes » (menu Recettes) et « Budget dépenses » (menu Dépenses) ; résultat prévisionnel vs réel.
- **Dépenses** : dépenses saisies = dépenses réelles ; bloc « Évaluation réel vs prévisionnel » (budget, payé, engagé, reste, économie/dépassement).
- **Programme** : page publique `/programme?event=ID` (consultation sans connexion) + carte « Partager le programme » : QR téléchargeable, lien copiable, envoi SMS aux participants confirmés ou à tous.
- **Client anonyme dédié** (`src/lib/supabasePublic.js`) pour les pages publiques : une session expirée dans le navigateur ne masque plus les données (RLS anon).
- Migrations : `20261123_engagement_budget.sql`, `20261123_programme_public.sql`.

## 2026-11-23 — Langue, paiements et recettes

- **Langue FR/EN** : sélecteur dans l'en-tête (mémorisé en localStorage), i18n maison `src/lib/i18n.jsx` (menu, en-tête, actions rapides, connexion, écran Recettes). Traductions des autres pages à compléter progressivement.
- **Paiement reçu à la confirmation** : trigger `guests_payment_sync` — dès qu'un participant passe à `confirmed`, sa ligne `finances` passe à `paid` (création incluse).
- **Recettes** : KPI Montant reçu / en attente / total / budget ; seuls les paiements reçus sont comptabilisés ; ventilation ventes vs manuel ; formulaire verrouillé sur le type « Manuel » (libellé libre), lignes « Vente » non modifiables/supprimables ; filtres Toutes/Ventes/Manuelles.
- Migration : `supabase/migrations/20261123_paiements_recettes.sql`.

## 2026-11-23 — SMS par événement (SMS MANAGER)

- 10 types de message activables par événement : invitation événement, invitation à s'inscrire, confirmation d'inscription, rappel de paiement, confirmation de paiement, confirmation de participation, rappels J-7 et J-1, message du jour J, remerciement.
- Réglages `sms_settings` (enabled + templates jsonb par événement) et journal `sms_log` ; RPC `log_sms` (anon inclus).
- Écran **SMS** : activation par type, modèle avec variables `{{prenom}} {{evenement}} {{date}} {{lieu}} {{table}} {{categorie}} {{montant}} {{billet}} {{lien}}`, aperçu, choix des destinataires (tous / confirmés / en attente / payés / impayés / présents / numéros manuels), envoi séquentiel + journal.
- Proxys serveur : Edge Function Supabase `sms` (clé `SMS_MANAGER_API_KEY` en secret, déployée) et fonction Vercel `/api/sms` en secours.
- Automatique : confirmation d'inscription à l'inscription, confirmation de participation à la validation admin (si le type est actif).
- Permission `gerer_sms` (Administrateur, Gestionnaire).

## 2026-11-23 — Anti-doublons, tables et module d'animation

- **Anti-doublons** : clé unique par événement (téléphone normalisé > email > nom), index unique partiel `guests_dedupe_uidx`, refus explicite dans `register_guest` (« Doublon : … est déjà inscrit(e) »).
- **Tables** : numérotation globale unique par événement (`n°001…`), index `tables_event_number_uidx`, attribution atomique (`pg_advisory_xact_lock`), capacité vérifiée par trigger, un couple consomme 2 places (`people_count` = `categories.seats`).
- **Animation** : tables `animations`, `animation_questions`, `animation_players`, `animation_answers`, `animation_candidates`, `animation_votes`, `animation_entries`, `animation_draws` + RPC `animation_join/state/answer/vote/enter/draw`, page admin `/animations`, page participant `/animation?event=ID` (quiz, vote, tombola, classement live).
- Migration SQL : `supabase/migrations/20261123_anti_doublons_tables_animation.sql` (idempotente).
- Tests : `npm test` 35/35, `node scripts/e2e-animation.mjs` 20/20.

- Renommage GALA MANAGER → EVEN MANAGER (interface + titre).
- Table events + event_id sur categories/guests/tickets/qrcodes/tables_placement.
- RPC create_event : copie 5 catégories standard + crée 100 tables par événement.
- RPC assign_table(p_people, p_event) : attribution par événement.
- Page Événements : créer/modifier/supprimer/activer un événement (admin).
- Sélecteur : l'événement actif est mémorisé (localStorage), défaut = premier événement.
- Lien public : /inscription-publique?event=ID.
- Événements existants : 1 Dîner Gala 2026, 2 Gala Annuel 2027 (démo).
- Tests 35/35, build OK.
## Relancer

Depuis le dossier durable :

```text
npm install
npm test
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Se connecter avec un utilisateur de **Supabase Authentication → Users du projet**, pas automatiquement avec les identifiants du dashboard Supabase. Ne jamais envoyer le mot de passe dans le chat.

## Suite recommandée

Après accès autorisé au projet Supabase : inspecter le schéma et les politiques, établir une migration sans données fictives, puis corriger/tester les opérations d'inscription, de validation et de QR contre ce contrat. Ne pas annoncer la fin de l'audit global avant ces vérifications.
