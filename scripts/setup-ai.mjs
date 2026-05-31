import { existsSync, readFileSync, appendFileSync } from "fs";
import { execSync } from "child_process";

function loadEnv() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
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

const env = loadEnv();
const hasLovable = !!(env.LOVABLE_API_KEY || env.OPENAI_API_KEY);
const hasGemini = !!(
  env.GEMINI_API_KEY ||
  env.GOOGLE_GENERATIVE_AI_API_KEY ||
  env.VITE_GEMINI_API_KEY
);

console.log("\n🤖 Configuration Assistant IA SOC\n");
console.log(`  LOVABLE_API_KEY : ${hasLovable ? "✅" : "❌"}`);
console.log(`  GEMINI_API_KEY  : ${hasGemini ? "✅" : "❌"}`);

if (!hasLovable && !hasGemini) {
  console.log(`
⚠️  Aucune clé IA trouvée. L'assistant fonctionne en mode démo.

Pour activer l'IA générative (gratuit) :
  1. Créez une clé sur https://aistudio.google.com/apikey
  2. Ajoutez dans .env :
     GEMINI_API_KEY=votre_cle_google

  3. Redémarrez : npm run dev
  4. (Prod) : npm run vercel:env && redéployez sur Vercel

Alternative Lovable : LOVABLE_API_KEY=... (dashboard Lovable)
`);
  process.exit(0);
}

if (hasGemini || hasLovable) {
  console.log("\n✅ Clé détectée — l'assistant utilisera l'IA via /api/soc-ai-chat\n");
  try {
    execSync("node scripts/sync-vercel-env.mjs", { stdio: "inherit" });
  } catch {
    console.log("(Sync Vercel ignoré — liez le projet avec: npx vercel link)");
  }
}

console.log("\n📦 Déploiement Supabase (optionnel) :");
console.log("  npx supabase login");
console.log("  npm run supabase:deploy-ai");
if (hasGemini) {
  console.log("  npx supabase secrets set GEMINI_API_KEY=... --project-ref pdzxabmqrlukhngnrkki");
}
console.log("");
