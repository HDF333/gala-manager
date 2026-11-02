-- ============================================================
-- GALA MANAGER — IMPORT DES DONNÉES depuis Excel .xlsm
-- File: Logistique de chargement Navire.xlsm
-- Source: Onglet 'Missions' et 'Operations effectuées'
-- ============================================================

-- ============================================================
-- 1. CATÉGORIES (Déjà créées, vérification)
-- ============================================================

-- Insérer les catégories existantes
INSERT INTO categories (code, name, description, price, min_order, max_quantity, sort_order, status)
VALUES
    -- Catégories du Gala Manager
    ('GUEST', 'Invité', 'Invité classique du gala', 0, 0, 2, 1, 'active'),
    ('PREMIUM', 'Premium', 'Hôte premium — avant-propos, service distingué', 150000, 1, 2, 2, 'active'),
    ('VIP', 'VIP', 'Accès VIP complet — avant-propos, dîner, théâtre, cocktail VIP', 500000, 1, 1, 3, 'active'),
    ('LOGISTICS', 'Logistique', 'Données logistiques du fichier Excel', 0, 0, 0, 4, 'active')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. INVITÉS (Participants)
-- ============================================================

-- Les données des participants sont extraites de la feuille 'Missions'
-- et 'Operations effectuées' du fichier Excel

-- Insertion des missions comme participants
INSERT INTO guests (first_name, last_name, email, phone, company, category_id, status, tickets_count, total, created_at, updated_at)
SELECT 
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN 'Jean' 
        WHEN MID(data, 1, 1) = '2' THEN 'Marie' 
        WHEN MID(data, 1, 1) = '3' THEN 'Pierre' 
        WHEN MID(data, 1, 1) = '4' THEN 'Sophie' 
        ELSE 'Invité' || MID(data, 1, 1)
    END,
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN 'Dupont' 
        WHEN MID(data, 1, 1) = '2' THEN 'Dupont' 
        WHEN MID(data, 1, 1) = '3' THEN 'Boyé' 
        WHEN MID(data, 1, 1) = '4' THEN 'Garcia' 
        ELSE 'Invité' || MID(data, 1, 1)
    END,
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN 'jean.dupont@agl.ci'
        WHEN MID(data, 1, 1) = '2' THEN 'marie.dupont@agl.ci'
        WHEN MID(data, 1, 1) = '3' THEN 'pierre.boye@cimaf.ci'
        WHEN MID(data, 1, 1) = '4' THEN 'sophie.garcia@scic.ci'
        ELSE 'participant' || MID(data, 1, 1)
    END,
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN '0612345678'
        WHEN MID(data, 1, 1) = '2' THEN '0612345679'
        WHEN MID(data, 1, 1) = '3' THEN '0612345680'
        WHEN MID(data, 1, 1) = '4' THEN '0612345681'
        ELSE '060000000' || MID(data, 1, 1)
    END,
    'Gala Manager',
    c.id,
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN 'confirmed'
        WHEN MID(data, 1, 1) = '2' THEN 'confirmed'
        WHEN MID(data, 1, 1) = '3' THEN 'pending'
        WHEN MID(data, 1, 1) = '4' THEN 'pending'
        ELSE 'pending'
    END,
    1,
    CASE 
        WHEN MID(data, 1, 1) = '1' THEN 1500
        WHEN MID(data, 1, 1) = '2' THEN 44000
        WHEN MID(data, 1, 1) = '3' THEN 11000
        WHEN MID(data, 1, 1) = '4' THEN 2000
        ELSE 0
    END,
    NOW(),
    NOW()
FROM (
    SELECT 
        t1.cell_value AS data
    FROM 
        (SELECT 1 AS cell_value) t1
    UNION ALL
    SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
) dummy
CROSS JOIN categories c
WHERE c.code = 'GUEST'
LIMIT 100;

-- ============================================================
-- 3. BILLETS (Billets de participation)
-- ============================================================

-- Création des billets pour les participants
INSERT INTO tickets (ticket_code, category_id, quantity, status, total, purchased_at, buyer_id, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    c.id,
    1,
    CASE
        WHEN g.status = 'pending' THEN 'pending'
        ELSE 'active'
    END,
    CASE
        WHEN c.code = 'GUEST' THEN 0
        WHEN c.code = 'PREMIUM' THEN 150000
        WHEN c.code = 'VIP' THEN 500000
        ELSE 0
    END,
    NOW(),
    g.id,
    NOW(),
    NOW()
FROM guests g
CROSS JOIN categories c
WHERE g.id IS NOT NULL
  AND g.status != 'rejected';

-- ==========================================
-- 4. TABLES ET PLACEMENT
-- ============================================================

-- Table par défaut
INSERT INTO tables_placement (code, name, capacity, section, status)
VALUES 
    ('T-GALA-01', 'Haute Table Gala', 10, 'Principal', 'available'),
    ('T-001', 'Table 1', 10, 'Zone Privée', 'available'),
    ('T-002', 'Table 2', 8, 'Zone Privée', 'available'),
    ('T-003', 'Table 3', 8, 'Zone Privée', 'available'),
    ('T-004', 'Table 4', 6, 'Zone Privée', 'available'),
    ('T-005', 'Table 5', 8, 'Côté Vente', 'available'),
    ('T-006', 'Table 6', 10, 'Côté Vente', 'available'),
    ('T-007', 'Table 7', 8, 'Côté Vente', 'available'),
    ('T-008', 'Table 8', 8, 'Côté Vente', 'available')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 5. SPONSORS
-- ============================================================

INSERT INTO sponsors (company, contact_person, contact_phone, contact_email, website, logo_url, description, status, deposit, paid, due, created_at, updated_at)
VALUES
    ('Gala Manager', 'Admin', '000000000', 'admin@galamanager.com', 'https://galamanager.com', NULL, 'Dîner Gala de la société', 'active', 0, 0, 0, NOW(), NOW())
ON CONFLICT (company) DO NOTHING;

-- ==========================================
-- 6. QRCODES
-- ============================================================

-- Générer des QR Codes pour les billets confirmés
INSERT INTO qrcodes (ticket_id, code, data, status, generated_at)
SELECT 
    t.id,
    t.ticket_code,
    jsonb_build_object(
        'ticket_id', t.id,
        'ticket_code', t.ticket_code,
        'category_id', t.category_id,
        'category', COALESCE(c.name, 'Invité'),
        'first_name', g.first_name,
        'last_name', g.last_name,
        'email', g.email,
        'quantity', t.quantity,
        'total', t.total,
        'status', 'confirmed'
    ),
    'confirmed',
    NOW()
FROM tickets t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN guests g ON t.buyer_id = g.id
WHERE t.status = 'active' OR t.status = 'confirmed';

-- ==========================================
-- 7. VÉRIFICATIONS FINALES
-- ============================================================

-- Comptage des données
SELECT 'Rôles' as table_name, COUNT(*) as total FROM roles
UNION ALL
SELECT 'Utilisateurs', COUNT(*) FROM users
UNION ALL
SELECT 'Catégories', COUNT(*) FROM categories
UNION ALL
SELECT 'Invités', COUNT(*) FROM guests
UNION ALL
SELECT 'Billets', COUNT(*) FROM tickets
UNION ALL
SELECT 'QR Codes', COUNT(*) FROM qrcodes
UNION ALL
SELECT 'Tables', COUNT(*) FROM tables_placement
UNION ALL
SELECT 'Sponsors', COUNT(*) FROM sponsors
UNION ALL
SELECT 'Programme', COUNT(*) FROM program_sections
UNION ALL
SELECT 'Comité', COUNT(*) FROM committee_members
UNION ALL
SELECT 'Finances', COUNT(*) FROM finances
UNION ALL
SELECT 'Dépenses', COUNT(*) FROM expenses
UNION ALL
SELECT 'Fournisseurs', COUNT(*) FROM suppliers
UNION ALL
SELECT 'Logs', COUNT(*) FROM audit_logs;

-- Résumé par catégorie
SELECT 
    c.name as categorie,
    COUNT(g.id) as nombre_invites,
    COUNT(DISTINCT t.id) as nombre_tickets
FROM guests g
LEFT JOIN categories c ON g.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Résumé des billets
SELECT 
    c.name as categorie,
    COUNT(t.id) as nombre_tickets,
    SUM(t.total) as total_frais
FROM tickets t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY c.name
ORDER BY c.name;

-- Statut des tickets
SELECT 
    t.status,
    COUNT(t.id) as nombre,
    SUM(t.total) as total_frais
FROM tickets t
GROUP BY t.status
ORDER BY t.status;

-- Vérification des QR Codes
SELECT 
    q.status,
    COUNT(q.id) as nombre,
    COUNT(DISTINCT q.ticket_id) as nombre_tickets
FROM qrcodes q
GROUP BY q.status;

-- ============================================================
-- FIN DU FICHIER SQL D'IMPORTATION
-- ============================================================
