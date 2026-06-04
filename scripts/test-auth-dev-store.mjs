/** Unit tests for dev auth store (no Supabase required) */
import { devAuthStore } from "../src/lib/auth-dev-store.ts";

let failed = 0;
function ok(n) { console.log("✅", n); }
function bad(n, e) { console.log("❌", n, e); failed++; }

await devAuthStore.storeOtp("user-1", "123456", 120000);
if (await devAuthStore.verifyOtp("user-1", "123456")) ok("otp verify");
else bad("otp verify");

if (!(await devAuthStore.verifyOtp("user-1", "000000"))) ok("otp reject wrong");
else bad("otp reject wrong");

const codes = devAuthStore.generateBackupCodesPlain(4);
await devAuthStore.setBackupCodes("user-1", codes);
if (await devAuthStore.verifyBackup("user-1", codes[0])) ok("backup verify");
else bad("backup verify");

await devAuthStore.saveSecurityAnswers("a@test.com", [
  { questionId: "dev-q1", answer: "wazuh" },
  { questionId: "dev-q2", answer: "dakar" },
]);
const qs = devAuthStore.getSecurityQuestionsForEmail("a@test.com");
if (qs.length === 2) ok("security questions listed");
else bad("security questions listed", qs.length);

if (await devAuthStore.verifySecurityAnswers("a@test.com", [
  { questionId: "dev-q1", answer: "wazuh" },
])) ok("security answers verify");
else bad("security answers verify");

console.log(failed ? `\n❌ ${failed} failed` : "\n✅ Dev store tests passed");
process.exit(failed ? 1 : 0);
