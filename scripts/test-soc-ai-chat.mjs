import { createClient } from "@supabase/supabase-js";
import fs from "fs";

function loadEnv() {
  const env = {};
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
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
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.functions.invoke("soc-ai-chat", {
  body: { messages: [{ role: "user", content: "Dis bonjour en une phrase." }] },
});

if (error) {
  console.error("INVOKE_ERROR:", error.message);
  if (error.context) console.error("CONTEXT:", await error.context.text?.().catch(() => error.context));
  process.exit(1);
}

if (data?.error) {
  console.error("FUNCTION_ERROR:", data.error);
  process.exit(1);
}

console.log("OK reply:", (data?.reply ?? "").slice(0, 200));
