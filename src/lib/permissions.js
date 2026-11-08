export const PERMISSIONS = [
  { key: 'scan_qr', short: 'Scan QR', label: 'Autoriser le scan des QR codes', desc: 'Contrôler l’entrée des participants en scannant leur billet QR.' },
  { key: 'gerer_participants', short: 'Inscriptions', label: 'Autoriser l’inscription des participants', desc: 'Inscrire un participant et gérer les invités de l’événement.' },
  { key: 'voir_invites', short: 'Participants', label: 'Autoriser la consultation des participants', desc: 'Voir la liste des participants, leur tribu et leur table.' },
  { key: 'voir_billets', short: 'Billets', label: 'Autoriser la consultation des billets', desc: 'Voir les billets vendus, leur catégorie et leur statut.' },
  { key: 'gerer_evenements', short: 'Événements', label: 'Autoriser la gestion des événements', desc: 'Créer, modifier, activer et supprimer des événements.' },
  { key: 'gerer_categories', short: 'Catégories', label: 'Autoriser la gestion des catégories', desc: 'Ajouter ou modifier les catégories et fixer leurs prix.' },
  { key: 'gerer_finances', short: 'Finances', label: 'Autoriser la gestion des recettes et dépenses', desc: 'Enregistrer recettes, dépenses et budgets de l’événement.' },
  { key: 'gerer_utilisateurs', short: 'Utilisateurs', label: 'Autoriser la gestion des utilisateurs', desc: 'Créer des comptes et attribuer rôles, permissions et événements.' },
]

export function hasPerm(profile, key) {
  if (!profile) return false
  if (profile.role === 'Administrateur') return true
  const perms = profile.permissions || []
  return perms.includes('*') || (key ? perms.includes(key) : true)
}
