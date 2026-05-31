import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const ENV_FILES = [".env.local", ".env"];
const TARGETS = ["production", "preview", "development"];
const KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "LOVABLE_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
];

function parseEnvFile(path) {
  const vars = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function loadLocalEnv() {
  const merged = {};
  for (const file of [...ENV_FILES].reverse()) {
    if (!existsSync(file)) continue;
    Object.assign(merged, parseEnvFile(file));
    console.log(`📄 Loaded ${file}`);
  }
  return merged;
}

function addVercelEnv(key, value, target) {
  execSync(`npx vercel env add ${key} ${target} --force`, {
    input: value,
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
  });
}

const local = loadLocalEnv();
if (Object.keys(local).length === 0) {
  console.error("❌ No .env or .env.local found.");
  process.exit(1);
}

// Mirror publishable key to anon alias when only one is defined locally.
if (local.VITE_SUPABASE_PUBLISHABLE_KEY && !local.VITE_SUPABASE_ANON_KEY) {
  local.VITE_SUPABASE_ANON_KEY = local.VITE_SUPABASE_PUBLISHABLE_KEY;
}
if (local.SUPABASE_PUBLISHABLE_KEY && !local.SUPABASE_URL && local.VITE_SUPABASE_URL) {
  local.SUPABASE_URL = local.VITE_SUPABASE_URL;
}
if (local.VITE_SUPABASE_URL && !local.SUPABASE_URL) {
  local.SUPABASE_URL = local.VITE_SUPABASE_URL;
}
if (local.VITE_SUPABASE_PUBLISHABLE_KEY && !local.SUPABASE_PUBLISHABLE_KEY) {
  local.SUPABASE_PUBLISHABLE_KEY = local.VITE_SUPABASE_PUBLISHABLE_KEY;
}

let synced = 0;
for (const target of TARGETS) {
  console.log(`\n🔧 Syncing to ${target}...`);
  for (const key of KEYS) {
    const value = local[key];
    if (!value) {
      console.log(`  ⏭️  ${key} (not in local env)`);
      continue;
    }
    try {
      addVercelEnv(key, value, target);
      console.log(`  ✅ ${key}`);
      synced++;
    } catch (error) {
      console.error(`  ❌ ${key}: ${error.stderr?.toString?.() || error.message}`);
      process.exit(1);
    }
  }
}

console.log(`\n🎉 Synced ${synced} variable(s) to Vercel.`);
