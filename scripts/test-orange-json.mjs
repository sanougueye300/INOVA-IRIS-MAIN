/**
 * Test Orange SMS Pro — API JSON
 * Usage : node scripts/test-orange-json.mjs [TOKEN] [numero]
 * Exemple: node scripts/test-orange-json.mjs montoken 775994942
 *
 * Si TOKEN est omis, utilise la valeur dans .env
 */

import crypto from 'node:crypto';
import https from 'node:https';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dir = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const content = readFileSync(path.join(__dir, '..', '.env'), 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 0) continue;
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      env[t.slice(0, eq).trim()] = val;
    }
    return env;
  } catch { return {}; }
}

function formatRecipient(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('221') && digits.length === 12) return digits;
  if (digits.length === 9) return `221${digits}`;
  if (digits.length === 10 && digits.startsWith('0')) return `221${digits.slice(1)}`;
  return digits;
}

const env     = loadEnv();
const TOKEN   = process.argv[2] && !process.argv[2].match(/^\d/) ? process.argv[2] : (env.ORANGE_SMSPRO_TOKEN || '');
const phone   = process.argv[2]?.match(/^\d/) ? process.argv[2] : (process.argv[3] || '775994942');

const API_KEY = env.ORANGE_SMSPRO_API_KEY   || '';
const SUBJ    = env.ORANGE_SMSPRO_SUBJECT   || 'test_API';
const SIG     = env.ORANGE_SMSPRO_SIGNATURE || 'INOVASECURE';
const BASE    = (env.ORANGE_SMSPRO_BASE_URL || 'https://api.orangesmspro.sn:8443/api/json');
const RECIP   = formatRecipient(phone);
const CODE    = Math.floor(100000 + Math.random() * 900000);
const CONTENT = `[INOVA-IRIS] Code 2FA : ${CODE}. Valable 2 minutes.`;
const TS      = Math.floor(Date.now() / 1000).toString();

if (!TOKEN) {
  console.error('❌ Token manquant. Usage: node scripts/test-orange-json.mjs TOKEN [numero]');
  process.exit(1);
}

// Mise à jour .env avec le token fourni
if (process.argv[2] && !process.argv[2].match(/^\d/)) {
  try {
    let envContent = readFileSync(path.join(__dir, '..', '.env'), 'utf8');
    envContent = envContent.replace(/^ORANGE_SMSPRO_TOKEN=.*/m, `ORANGE_SMSPRO_TOKEN=${TOKEN}`);
    writeFileSync(path.join(__dir, '..', '.env'), envContent, 'utf8');
    console.log('✅ .env mis à jour avec le nouveau token\n');
  } catch {}
}

// ── Payload JSON ─────────────────────────────────────────────────────────────
const payload = JSON.stringify({
  messages: [{
    signature: SIG,
    subject: SUBJ,
    content: CONTENT,
    recipients: [{ id: "1", value: RECIP }]
  }]
});

// ── HMAC-SHA1 : token + JSON_payload + timestamp ──────────────────────────────
const msgToSign = `${TOKEN}${payload}${TS}`;
const hmacKey   = crypto.createHmac('sha1', API_KEY).update(msgToSign).digest('hex');

// ── URL ───────────────────────────────────────────────────────────────────────
const url = new URL(BASE);
url.searchParams.set('token', TOKEN);
url.searchParams.set('key', hmacKey);
url.searchParams.set('timestamp', TS);

console.log('\n📱 ORANGE SMS PRO — API JSON');
console.log('════════════════════════════════════════════════════════');
console.log(`Endpoint   : ${url.origin}${url.pathname}`);
console.log(`Token      : ${TOKEN.slice(0, 10)}...`);
console.log(`API Key    : ${API_KEY.slice(0, 10)}...`);
console.log(`Signature  : ${SIG}`);
console.log(`Subject    : ${SUBJ}`);
console.log(`Destinat.  : ${RECIP}`);
console.log(`Code OTP   : ${CODE}`);
console.log(`Timestamp  : ${TS}`);
console.log(`HMAC key   : ${hmacKey}`);
console.log('────────────────────────────────────────────────────────');
console.log('Payload JSON:');
console.log(JSON.stringify(JSON.parse(payload), null, 2));
console.log('════════════════════════════════════════════════════════\n');
console.log('📡 Envoi en cours...\n');

// ── Requête POST ──────────────────────────────────────────────────────────────
const urlParsed = new URL(url.toString());
const options = {
  hostname: urlParsed.hostname,
  port: parseInt(urlParsed.port) || 8443,
  path: urlParsed.pathname + urlParsed.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Accept': 'application/json',
  },
  rejectUnauthorized: false, // SSL auto-signé Orange
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`HTTP ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('Réponse:', JSON.stringify(json, null, 2));
      const responses = json?.response || json || [];
      const first = Array.isArray(responses) ? responses[0] : responses;
      const sc = first?.status_code ?? first?.STATUS;

      console.log('\n' + '═'.repeat(56));
      if (sc === 100 || sc === 200) {
        console.log('🎉🎉🎉 SMS ENVOYÉ AVEC SUCCÈS !');
        console.log(`   Code OTP : ${CODE}`);
        console.log(`   Vérifiez votre téléphone ${RECIP}`);
      } else if (sc === 102) {
        console.log('❌ Code 102 — Signature invalide');
        console.log('   → Vérifiez SIGNATURE sur portail Orange : Paramètres > Signatures');
      } else if (sc === 109) {
        console.log('❌ Code 109 — Format JSON invalide');
      } else if (sc === 115) {
        console.log('⏱️ Code 115 — Requête expirée (HMAC déjà utilisé ou token invalide)');
        console.log('   → Régénérez le token sur le portail Orange');
      } else if (sc === 116) {
        console.log('⚠️ Code 116 — Token invalide');
        console.log('   → Régénérez le token : Paramètres > API > Token');
      } else {
        console.log(`⚠️ Code ${sc}: ${first?.status_text}`);
      }
      console.log('═'.repeat(56) + '\n');
    } catch {
      console.log('Réponse brute:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Erreur réseau:', e.message);
  if (e.code === 'ENOTFOUND') console.error('   → Pas d\'accès Internet à orangesmspro.sn');
});

req.setTimeout(30000, () => {
  req.destroy();
  console.error('\n❌ Timeout après 30s');
});

req.write(payload);
req.end();
