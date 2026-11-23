# EVEN MANAGER — état du projet (multi-événements)

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
