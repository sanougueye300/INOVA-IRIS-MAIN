import { readFileSync, existsSync } from "fs";

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    console.log(`📄 Chargement de ${file}...`);
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

async function sendTestEmail(key, from, to, subject, html) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${key}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    
    if (res.ok) {
      console.log(`✅ E-mail envoyé avec succès à ${to} avec l'expéditeur "${from}" !`);
      console.log(`Détails de la réponse :`, await res.json());
      return true;
    }
    
    const errText = await res.text();
    console.warn(`⚠️ Échec de l'envoi avec l'expéditeur "${from}" :`, errText);
    
    if (from !== "onboarding@resend.dev") {
      console.info("🔄 Tentative de secours avec onboarding@resend.dev...");
      return await sendTestEmail(key, "onboarding@resend.dev", to, subject, html);
    }
    
    return false;
  } catch (err) {
    console.error("❌ Erreur lors de l'envoi :", err.message);
    return false;
  }
}

async function main() {
  const env = loadEnv();
  const key = env.RESEND_API_KEY;
  const from = env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev";
  const testEmail = process.argv[2] ?? env.TEST_USER_EMAIL ?? "sanougueye300@gmail.com";

  console.log("\n=======================================================");
  console.log("🔍 Vérification de la configuration Resend...");
  console.log("=======================================================");

  if (!key) {
    console.error("❌ RESEND_API_KEY manquante dans votre fichier .env ou .env.local.");
    console.log("\nPour configurer Resend :");
    console.log("1. Allez sur https://resend.com et créez un compte gratuit.");
    console.log("2. Générez une clé API et ajoutez-la à votre fichier .env ou .env.local :");
    console.log('   RESEND_API_KEY="re_votreCleGénérée"');
    console.log("3. Lancez ce script à nouveau pour retester.");
    process.exit(1);
  }

  console.log(`✅ Clé API Resend détectée (commence par : ${key.substring(0, 5)}...)`);
  console.log(`📧 Expéditeur configuré : ${from}`);
  console.log(`📬 E-mail cible de test : ${testEmail}`);
  console.log("-------------------------------------------------------");
  console.log("🚀 Envoi d'un e-mail de test (simulation OTP + Reset)...");

  const testHtml = `
    <div style="background:#0f172a; color:#e4e4e7; font-family:sans-serif; padding:40px; border-radius:12px;">
      <h2 style="color:#fb923c; text-align:center;">🛡️ Test Resend INOVA-IRIS</h2>
      <p>Bonjour Mr Gueye,</p>
      <p>Ceci est un e-mail de test pour valider la configuration de Resend sur votre plateforme de cyberdéfense.</p>
      
      <div style="background:#18181b; padding:20px; border-radius:8px; border:1px solid #27272a; margin:20px 0; text-align:center;">
        <p style="margin:0 0 10px; font-size:12px; text-transform:uppercase; color:#a1a1aa;">Code de double authentification (OTP) :</p>
        <span style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#fb923c; font-family:monospace;">884942</span>
        <p style="margin:10px 0 0; font-size:11px; color:#71717a;">Valide 2 minutes.</p>
      </div>

      <div style="margin:30px 0; text-align:center;">
        <a href="http://localhost:8080/auth/reset-password?token=test-token" style="background:#ea580c; color:#fff; padding:12px 24px; text-decoration:none; font-weight:bold; border-radius:8px; display:inline-block;">
          Lien de réinitialisation de mot de passe (Test)
        </a>
      </div>

      <hr style="border:none; border-top:1px solid #27272a; margin:30px 0;" />
      <p style="font-size:11px; color:#71717a; text-align:center;">© Sonatel SOC INOVA-IRIS</p>
    </div>
  `;

  const success = await sendTestEmail(key, from, testEmail, "Test de configuration Resend — INOVA-IRIS", testHtml);

  if (success) {
    console.log("\n🎉 TEST RÉUSSI ! La configuration de Resend fonctionne parfaitement.");
    process.exit(0);
  } else {
    console.error("\n❌ TEST ÉCHOUÉ. Veuillez vérifier votre clé API Resend ou le domaine de l'expéditeur.");
    process.exit(1);
  }
}

main().catch(console.error);
