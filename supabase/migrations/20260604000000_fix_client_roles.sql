-- Migration pour ajouter le rôle 'client' aux utilisateurs qui n'ont pas de rôle
-- Cela corrige le problème des clients créés avant la correction de la fonction Edge

-- Insérer le rôle 'client' pour tous les profils qui n'ont pas de rôle dans user_roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'client'
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Afficher les utilisateurs concernés
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM profiles p
    WHERE NOT EXISTS (
        SELECT 1 
        FROM user_roles ur 
        WHERE ur.user_id = p.id
    );
    
    RAISE NOTICE 'Migration terminée: % utilisateur(s) ont reçu le rôle client', affected_count;
END $$;
