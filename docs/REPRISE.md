# EVEN MANAGER — état du projet (multi-événements)

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
