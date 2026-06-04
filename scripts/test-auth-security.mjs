/**
 * Tests auth-security API (dev + production paths).
 * Usage: node scripts/test-auth-security.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "fs";

const BASE = process.argv[2] ?? "http://localhost:8080";

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

async function api(action, payload = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api/auth-security`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, redirectOrigin: BASE, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function signIn(env) {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const key =
    env.VITE_SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.SUPABASE_PUBLISHABLE_KEY;
  const email = env.TEST_USER_EMAIL;
  const password = env.TEST_USER_PASSWORD;
  if (!url || !key || !email || !password) return null;

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.access_token ?? null;
}

const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`✅ ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

async function main() {
  console.log(`\n🔐 Test auth-security @ ${BASE}\n`);
  const env = loadEnv();

  // 1. Password reset (public)
  const reset = await api("send_password_reset", { email: "test@example.com" });
  if (reset.status === 200 && reset.data.ok) pass("send_password_reset");
  else fail("send_password_reset", JSON.stringify(reset.data));

  // 2. Security questions catalog (needs auth in prod, dev allows)
  const token = await signIn(env);

  if (token) {
    const catalog = await api("list_security_question_catalog", {}, token);
    if (catalog.status === 200 && catalog.data.questions?.length) {
      pass("list_security_question_catalog");
    } else {
      fail("list_security_question_catalog", JSON.stringify(catalog.data));
    }

    // 3. Save security answers
    const qs = catalog.data?.questions?.slice(0, 2) ?? [];
    if (qs.length >= 2) {
      const save = await api(
        "save_security_answers",
        {
          answers: [
            { questionId: qs[0].id, answer: "wazuh-master-01" },
            { questionId: qs[1].id, answer: "dakar" },
          ],
        },
        token,
      );
      if (save.status === 200 && save.data.ok) pass("save_security_answers");
      else fail("save_security_answers", JSON.stringify(save.data));

      const email = env.TEST_USER_EMAIL;
      const getQ = await api("get_security_questions", { email });
      if (getQ.status === 200 && getQ.data.questions?.length >= 1) pass("get_security_questions");
      else fail("get_security_questions", JSON.stringify(getQ.data));
    }

    // 4. SMS OTP flow
    const otpSend = await api("send_sms_otp", {}, token);
    if (otpSend.status === 200 && otpSend.data.ok) {
      pass("send_sms_otp");
      const code = otpSend.data.devOtp;
      if (code) {
        const verify = await api("verify_sms_otp", { code }, token);
        if (verify.status === 200 && verify.data.verified) pass("verify_sms_otp");
        else fail("verify_sms_otp", JSON.stringify(verify.data));
      } else {
        console.log("⚠️  verify_sms_otp skipped (no devOtp in response — Twilio actif?)");
      }
    } else {
      fail("send_sms_otp", JSON.stringify(otpSend.data));
    }

    // 5. Backup codes
    const gen = await api("generate_backup_codes", {}, token);
    if (gen.status === 200 && gen.data.codes?.length === 8) {
      pass("generate_backup_codes");
      const verifyB = await api("verify_backup_code", { code: gen.data.codes[0] }, token);
      if (verifyB.status === 200 && verifyB.data.verified) pass("verify_backup_code");
      else fail("verify_backup_code", JSON.stringify(verifyB.data));
    } else {
      fail("generate_backup_codes", JSON.stringify(gen.data));
    }
  } else {
    console.log("⚠️  Tests authentifiés ignorés — définissez TEST_USER_EMAIL et TEST_USER_PASSWORD dans .env");
    const catalogDev = await api("list_security_question_catalog", {});
    if (catalogDev.status === 400) {
      pass("API répond (mode auth requis pour catalog sans session — normal)");
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n📊 ${results.length - failed.length}/${results.length} tests OK\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
