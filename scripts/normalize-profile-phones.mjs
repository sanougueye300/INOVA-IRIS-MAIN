/** Normalise tous les numéros sénégalais sans indicatif dans profiles. */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
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

function normalizePhone(phone) {
  if (!phone?.trim()) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+221${digits.slice(1)}`;
  return trimmed;
}

const env = loadEnv();
const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("❌ Variables Supabase manquantes");
  process.exit(1);
}

const admin = createClient(url, key);
const { data: profiles, error } = await admin.from("profiles").select("id, email, phone").not("phone", "is", null);

if (error) {
  console.error("❌", error.message);
  process.exit(1);
}

let updated = 0;
for (const p of profiles ?? []) {
  const normalized = normalizePhone(p.phone);
  if (normalized && normalized !== p.phone) {
    const { error: uErr } = await admin.from("profiles").update({ phone: normalized }).eq("id", p.id);
    if (!uErr) {
      console.log(`✅ ${p.email}: ${p.phone} → ${normalized}`);
      updated++;
    }
  }
}

const target = (profiles ?? []).filter((p) => p.phone?.includes("775994942"));
if (target.length) {
  console.log("\n📱 Profils avec 775994942:");
  for (const p of target) console.log(`  - ${p.email}: ${p.phone}`);
} else {
  console.log("\n⚠️  Aucun profil avec 775994942 trouvé — vérifiez l'e-mail du compte.");
}

console.log(`\n🎉 ${updated} numéro(s) normalisé(s).`);
