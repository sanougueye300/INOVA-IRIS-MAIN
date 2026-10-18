import { supabase } from "@/integrations/supabase/client";

export interface RegisteredClientAccount {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  phone?: string;
}

export async function authenticateRegisteredClient(account: RegisteredClientAccount) {
  const email = account.email.trim().toLowerCase();
  const { data: signup, error: signupError } = await supabase.auth.signUp({
    email,
    password: account.password,
    options: {
      data: {
        full_name: account.fullName,
        organization: account.companyName,
      },
    },
  });

  let session = signup.session;
  let user = signup.user;

  if (signupError || !session) {
    const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: account.password,
    });

    if (loginError || !login.session || !login.user) {
      if (signupError) throw signupError;
      if (loginError?.message.toLowerCase().includes("email not confirmed")) {
        throw new Error("Compte créé. Confirmez votre adresse e-mail avant de vous connecter.");
      }
      throw loginError ?? new Error("Supabase n'a pas ouvert de session authentifiée.");
    }

    session = login.session;
    user = login.user;
  }

  if (!session || !user) {
    throw new Error("Le compte existe, mais aucune session authentifiée n'a été créée.");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      email,
      full_name: account.fullName,
      organization: account.companyName,
      phone: account.phone || null,
    })
    .eq("id", user.id);

  if (profileError) throw profileError;

  localStorage.removeItem("inova_mock_user");
  localStorage.removeItem("inova_registered_user");
  return user;
}

export function getClientPcSyncErrorMessage(error: unknown): string {
  const dbError = error as { code?: string; message?: string };
  const code = dbError?.code;
  const message = dbError?.message ?? "Erreur inconnue";

  if (code === "PGRST205" || code === "42P01") {
    return "La table des postes client n'existe pas encore dans ce projet Supabase. Appliquez la migration client_pcs puis réessayez.";
  }
  if (code === "23503" || code === "22P02") {
    return "Ce compte client n'a pas encore d'identifiant Supabase valide. Déconnectez-vous puis reconnectez-vous avec votre compte client.";
  }
  if (code === "42501" || code === "PGRST301") {
    return "Supabase a refusé l'accès. Vérifiez la session du compte et les règles RLS de la table client_pcs.";
  }

  return `Échec de synchronisation Supabase : ${message}`;
}