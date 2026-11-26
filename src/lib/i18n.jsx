import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const DICT = {
  fr: {
    'nav.events': 'Événements',
    'nav.scan': 'Scanner',
    'nav.users': 'Utilisateurs',
    'nav.dashboard': 'Tableau de bord',
    'nav.guests': 'Participants',
    'nav.inscription': 'Inscription',
    'nav.administration': 'Administration',
    'nav.access': "Contrôle d'accès",
    'nav.animation': 'Animation',
    'nav.sms': 'SMS',
    'nav.tables': 'Tables',
    'nav.sponsors': 'Sponsors',
    'nav.finances': 'Recettes',
    'nav.budget': 'Budget',
    'nav.expenses': 'Dépenses',
    'nav.program': 'Programme',
    'nav.committee': 'Comité',
    'nav.qrcodes': 'QR Codes',

    'auth.subtitle': 'Connexion au dîner-gala',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.signIn': 'Se connecter',
    'auth.signingIn': 'Connexion...',
    'auth.badCredentials': 'Email ou mot de passe incorrect. Utilisez un compte de l’application, pas celui du tableau de bord Supabase.',

    'common.logout': 'Déconnexion',
    'common.loggingOut': 'Déconnexion...',
    'common.loading': 'Chargement de EVEN MANAGER...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.add': 'Ajouter',
    'common.update': 'Mettre à jour',
    'common.delete': 'Supprimer',
    'common.search': 'Rechercher...',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.amount': 'Montant',
    'common.status': 'Statut',
    'common.type': 'Type',
    'common.total': 'Total',
    'common.all': 'Tous',
    'common.confirmDelete': 'Supprimer cette ligne ?',
    'common.error': 'Erreur',

    'quick.newRegistration': 'Nouvelle inscription',
    'quick.newEvent': 'Nouvel événement',
    'quick.registerGuest': 'Inscrire un participant',
    'quick.newCategory': 'Nouvelle catégorie',
    'quick.newUser': 'Nouvel utilisateur',
    'quick.newSponsor': 'Nouveau sponsor',
    'quick.newIncome': 'Nouvelle recette',
    'quick.newExpense': 'Nouvelle dépense',
    'quick.newItem': 'Nouvel élément',
    'quick.newMember': 'Nouveau membre',
    'quick.generateQr': 'Générer un QR code',
    'quick.newAnimation': 'Nouvelle animation',

    'page.dashboard': 'Tableau de bord',
    'page.guests': 'Participants',
    'page.inscription': 'Inscription',
    'page.administration': 'Administration des Inscriptions',
    'page.tables': 'Tables',
    'page.finances': 'Recettes',
    'page.expenses': 'Dépenses',
    'page.events': 'Événements',
    'page.animations': 'Animation',
    'page.sms': 'Messages SMS',
    'page.access': "Contrôle d'accès",
    'page.qrcodes': 'QR Codes',
    'page.program': 'Programme',
    'page.committee': 'Comité',
    'page.sponsors': 'Sponsors',
    'page.users': 'Utilisateurs',
    'page.scan': 'Scanner QR',
    'page.notFound': 'Page introuvable',

    'status.confirmed': 'Confirmé',
    'status.pending': 'En attente',
    'status.rejected': 'Rejeté',
    'status.cancelled': 'Annulé',
    'status.paid': 'Reçu',
    'status.unpaid': 'En attente',

    'finance.title': 'Recettes',
    'finance.subtitle': "Encaissements de l'événement actif — seuls les paiements reçus sont comptabilisés en ventes.",
    'finance.budget': 'Budget recettes',
    'finance.received': 'Montant reçu',
    'finance.pending': 'Montant en attente',
    'finance.total': 'Montant total',
    'finance.salesReceived': 'Ventes encaissées',
    'finance.salesPending': 'Ventes en attente',
    'finance.manual': 'Recettes manuelles',
    'finance.addTitle': 'Ajouter une recette manuelle',
    'finance.editTitle': 'Modifier une recette',
    'finance.label': 'Libellé (ex. sponsor, don, billetterie physique)',
    'finance.amount': 'Montant (FCFA) *',
    'finance.statusLabel': 'Statut du paiement',
    'finance.dateLabel': 'Date du paiement',
    'finance.add': 'Ajouter',
    'finance.update': 'Mettre à jour',
    'finance.list': 'Liste des recettes',
    'finance.reference': 'N° / Référence',
    'finance.qr': 'N° QR code',
    'finance.added': 'Recette ajoutée',
    'finance.updated': 'Recette modifiée',
    'finance.deleted': 'Recette supprimée',
    'finance.typeFixed': 'Manuel',
    'finance.typeSale': 'Vente',
    'finance.noRows': 'Aucune recette enregistrée pour cet événement.',
    'finance.filterAll': 'Toutes',
    'finance.filterSales': 'Ventes',
    'finance.filterManual': 'Manuelles'
  },
  en: {
    'nav.events': 'Events',
    'nav.scan': 'Scan',
    'nav.users': 'Users',
    'nav.dashboard': 'Dashboard',
    'nav.guests': 'Guests',
    'nav.inscription': 'Registration',
    'nav.administration': 'Administration',
    'nav.access': 'Access control',
    'nav.animation': 'Entertainment',
    'nav.sms': 'SMS',
    'nav.tables': 'Tables',
    'nav.sponsors': 'Sponsors',
    'nav.finances': 'Income',
    'nav.budget': 'Budget',
    'nav.expenses': 'Expenses',
    'nav.program': 'Programme',
    'nav.committee': 'Committee',
    'nav.qrcodes': 'QR codes',

    'auth.subtitle': 'Sign in to the gala dinner',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign in',
    'auth.signingIn': 'Signing in...',
    'auth.badCredentials': 'Wrong email or password. Use an application account, not your Supabase dashboard account.',

    'common.logout': 'Sign out',
    'common.loggingOut': 'Signing out...',
    'common.loading': 'Loading EVEN MANAGER...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.add': 'Add',
    'common.update': 'Update',
    'common.delete': 'Delete',
    'common.search': 'Search...',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.amount': 'Amount',
    'common.status': 'Status',
    'common.type': 'Type',
    'common.total': 'Total',
    'common.all': 'All',
    'common.confirmDelete': 'Delete this row?',
    'common.error': 'Error',

    'quick.newRegistration': 'New registration',
    'quick.newEvent': 'New event',
    'quick.registerGuest': 'Register a guest',
    'quick.newCategory': 'New category',
    'quick.newUser': 'New user',
    'quick.newSponsor': 'New sponsor',
    'quick.newIncome': 'New income entry',
    'quick.newExpense': 'New expense',
    'quick.newItem': 'New item',
    'quick.newMember': 'New member',
    'quick.generateQr': 'Generate a QR code',
    'quick.newAnimation': 'New activity',

    'page.dashboard': 'Dashboard',
    'page.guests': 'Guests',
    'page.inscription': 'Registration',
    'page.administration': 'Registration administration',
    'page.tables': 'Tables',
    'page.finances': 'Income',
    'page.expenses': 'Expenses',
    'page.events': 'Events',
    'page.animations': 'Entertainment',
    'page.sms': 'SMS messages',
    'page.access': 'Access control',
    'page.qrcodes': 'QR codes',
    'page.program': 'Programme',
    'page.committee': 'Committee',
    'page.sponsors': 'Sponsors',
    'page.users': 'Users',
    'page.scan': 'QR scan',
    'page.notFound': 'Page not found',

    'status.confirmed': 'Confirmed',
    'status.pending': 'Pending',
    'status.rejected': 'Rejected',
    'status.cancelled': 'Cancelled',
    'status.paid': 'Received',
    'status.unpaid': 'Pending',

    'finance.title': 'Income',
    'finance.subtitle': 'Active event receipts — only received payments count as sales.',
    'finance.budget': 'Income budget',
    'finance.received': 'Amount received',
    'finance.pending': 'Amount pending',
    'finance.total': 'Total amount',
    'finance.salesReceived': 'Sales received',
    'finance.salesPending': 'Sales pending',
    'finance.manual': 'Manual income',
    'finance.addTitle': 'Add manual income',
    'finance.editTitle': 'Edit income',
    'finance.label': 'Label (e.g. sponsor, donation, cash ticket)',
    'finance.amount': 'Amount (FCFA) *',
    'finance.statusLabel': 'Payment status',
    'finance.dateLabel': 'Payment date',
    'finance.add': 'Add',
    'finance.update': 'Update',
    'finance.list': 'Income list',
    'finance.reference': 'No. / Reference',
    'finance.qr': 'QR code no.',
    'finance.added': 'Income added',
    'finance.updated': 'Income updated',
    'finance.deleted': 'Income deleted',
    'finance.typeFixed': 'Manual',
    'finance.typeSale': 'Sale',
    'finance.noRows': 'No income recorded for this event.',
    'finance.filterAll': 'All',
    'finance.filterSales': 'Sales',
    'finance.filterManual': 'Manual'
  }
}

const LanguageContext = createContext({ lang: 'fr', setLang: () => {}, t: (k) => DICT.fr[k] || k })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('even_lang') || 'fr' } catch { return 'fr' }
  })

  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('even_lang', l) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback((key, vars) => {
    const table = DICT[lang] || DICT.fr
    let s = table[key] ?? DICT.fr[key] ?? key
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''))
    return s
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  return useContext(LanguageContext)
}

export default LanguageProvider
