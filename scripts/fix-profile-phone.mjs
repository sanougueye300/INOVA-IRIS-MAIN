/**
 * Corrige le numéro de téléphone d'un profil (ex: 775994942 → +221775994942).
 * Usage: node scripts/fix-profile-phone.mjs <email> [phone]
 */
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
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (digits.startsWith("221") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+221${digits.slice(1)}`;
  return trimmed;
}

const email = process.argv[2];
const phoneArg = process.argv[3] ?? "775994942";

if (!email) {
  console.error("Usage: node scripts/fix-profile-phone.mjs <email> [phone]");
  process.exit(1);
}

const env = loadEnv();
const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env");
  process.exit(1);
}

const admin = createClient(url, key);
const normalized = normalizePhone(phoneArg);

const { data: profile, error: findErr } = await admin
  .from("profiles")
  .select("id, email, phone, full_name")
  .eq("email", email.trim().toLowerCase())
  .maybeSingle();

if (findErr || !profile) {
  console.error("❌ Profil introuvable pour", email, findErr?.message ?? "");
  process.exit(1);
}

console.log("Avant:", profile.phone ?? "(vide)");
console.log("Après:", normalized);

const { error: updateErr } = await admin
  .from("profiles")
  .update({ phone: normalized })
  .eq("id", profile.id);

if (updateErr) {
  console.error("❌ Mise à jour échouée:", updateErr.message);
  process.exit(1);
}

console.log(`✅ Téléphone mis à jour pour ${profile.full_name ?? email}`);
