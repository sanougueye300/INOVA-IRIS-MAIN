import { readFileSync, existsSync, writeFileSync } from "fs";

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

const env = loadEnv();
const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
const key =
  env.VITE_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.SUPABASE_PUBLISHABLE_KEY;
const BASE = process.argv[2] ?? "http://localhost:8080";

const email = `test-auth-${Date.now()}@inova-iris.test`;
const password = "TestAuth2026!Secure";

async function api(action, payload, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/auth-security`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, redirectOrigin: BASE, ...payload }),
  });
  return { status: res.status, data: await res.json() };
}

const signup = await fetch(`${url}/auth/v1/signup`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const signupJson = await signup.json();
let token = signupJson.access_token;

if (!token) {
  const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.TEST_USER_EMAIL ?? email,
      password: env.TEST_USER_PASSWORD ?? password,
    }),
  });
  const loginJson = await login.json();
  token = loginJson.access_token;
}

if (!token) {
  console.error("Auth failed (signup/login):", signupJson.msg ?? signupJson);
  process.exit(1);
}

console.log("Authenticated for E2E tests");

let failed = 0;

const catalog = await api("list_security_question_catalog", {}, token);
if (catalog.data.questions?.length) console.log("✅ catalog");
else { console.log("❌ catalog", catalog.data); failed++; }

const qs = catalog.data.questions.slice(0, 2);
const save = await api("save_security_answers", {
  answers: [
    { questionId: qs[0].id, answer: "wazuh-master-01" },
    { questionId: qs[1].id, answer: "dakar" },
  ],
}, token);
if (save.data.ok) console.log("✅ save_security_answers");
else { console.log("❌ save", save.data); failed++; }

const getQ = await api("get_security_questions", { email });
if (getQ.data.questions?.length >= 1) console.log("✅ get_security_questions");
else { console.log("❌ getQ", getQ.data); failed++; }

const otp = await api("send_sms_otp", {}, token);
if (otp.data.ok && otp.data.devOtp) {
  console.log("✅ send_sms_otp devOtp=" + otp.data.devOtp);
  const v = await api("verify_sms_otp", { code: otp.data.devOtp }, token);
  if (v.data.verified) console.log("✅ verify_sms_otp");
  else { console.log("❌ verify", v.data); failed++; }
} else { console.log("❌ otp", otp.data); failed++; }

const gen = await api("generate_backup_codes", {}, token);
if (gen.data.codes?.length === 8) {
  console.log("✅ generate_backup_codes");
  const vb = await api("verify_backup_code", { code: gen.data.codes[0] }, token);
  if (vb.data.verified) console.log("✅ verify_backup_code");
  else { console.log("❌ backup verify", vb.data); failed++; }
} else { console.log("❌ gen backup", gen.data); failed++; }

const reset = await api("send_password_reset", { email: "noreply@example.com" });
if (reset.data.sent) console.log("✅ send_password_reset");
else { console.log("❌ reset", reset.data); failed++; }

console.log(failed ? `\n❌ ${failed} failed` : "\n✅ All E2E auth tests passed");
process.exit(failed ? 1 : 0);
