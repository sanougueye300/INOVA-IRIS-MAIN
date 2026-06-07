#!/usr/bin/env node

/**
 * Script pour ajouter le rôle 'client' aux utilisateurs existants
 * qui n'ont pas de rôle dans la table user_roles
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement Supabase manquantes');
  console.error('   Assurez-vous que VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixClientRoles() {
  console.log('🔧 Début de la correction des rôles clients...\n');

  try {
    // 1. Récupérer tous les profils
    console.log('📋 Récupération de tous les profils...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization');

    if (profilesError) {
      throw new Error(`Erreur lors de la récupération des profils: ${profilesError.message}`);
    }

    console.log(`✓ ${profiles.length} profils trouvés\n`);

    // 2. Récupérer tous les rôles existants
    console.log('📋 Récupération des rôles existants...');
    const { data: existingRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      throw new Error(`Erreur lors de la récupération des rôles: ${rolesError.message}`);
    }

    console.log(`✓ ${existingRoles.length} rôles existants trouvés\n`);

    // 3. Identifier les utilisateurs sans rôle
    const userIdsWithRoles = new Set(existingRoles.map(r => r.user_id));
    const usersWithoutRoles = profiles.filter(p => !userIdsWithRoles.has(p.id));

    console.log(`🔍 Utilisateurs sans rôle: ${usersWithoutRoles.length}\n`);

    if (usersWithoutRoles.length === 0) {
      console.log('✅ Tous les utilisateurs ont déjà un rôle assigné!');
      return;
    }

    // 4. Afficher les utilisateurs qui vont recevoir le rôle
    console.log('👥 Utilisateurs qui vont recevoir le rôle "client":');
    usersWithoutRoles.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.full_name || 'Sans nom'}) - ${user.organization || 'Sans organisation'}`);
    });
    console.log('');

    // 5. Insérer le rôle 'client' pour ces utilisateurs
    console.log('💾 Insertion des rôles...');
    const rolesToInsert = usersWithoutRoles.map(user => ({
      user_id: user.id,
      role: 'client'
    }));

    const { data: insertedRoles, error: insertError } = await supabase
      .from('user_roles')
      .insert(rolesToInsert)
      .select();

    if (insertError) {
      throw new Error(`Erreur lors de l'insertion des rôles: ${insertError.message}`);
    }

    console.log(`✅ ${insertedRoles.length} rôle(s) "client" ajouté(s) avec succès!\n`);

    // 6. Vérification finale
    console.log('🔍 Vérification finale...');
    const { data: finalRoles, error: finalError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (finalError) {
      throw new Error(`Erreur lors de la vérification finale: ${finalError.message}`);
    }

    const clientRoles = finalRoles.filter(r => r.role === 'client');
    console.log(`✓ Total de rôles "client" dans la base: ${clientRoles.length}`);
    console.log(`✓ Total de rôles dans la base: ${finalRoles.length}\n`);

    console.log('🎉 Migration terminée avec succès!');
    console.log('   Les clients devraient maintenant apparaître dans la liste /clients\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exécution:', error.message);
    process.exit(1);
  }
}

// Exécuter le script
fixClientRoles();
