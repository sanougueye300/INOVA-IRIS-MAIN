import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serviceClient } from "../_shared/tenant.ts";

// =============================================================================
// soar-enrich-alert — Playbook d'orchestration (SOAR)
// Scénario : alerte Wazuh -> extraction des IOC -> enrichissement VirusTotal +
// MISP -> verdict/score de risque -> création automatique d'un cas TheHive.
// Tout est cloisonné par `organization` (multi-tenant).
//
// Appel :
//   POST { "alert_id": "<uuid>" }   -> enrichit une alerte précise
//   POST { "limit": 5 }             -> enrichit les N alertes 'new' non enrichies
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VT_BASE = "https://www.virustotal.com/api/v3";
const MAX_IOCS_PER_ALERT = 4; // VirusTotal gratuit : 4 req/min

type IocType = "hash" | "ip" | "domain";
interface Ioc { type: IocType; value: string; }
interface IocVerdict extends Ioc {
  vtMalicious: number;
  mispKnown: boolean;
  threatName?: string;
}

// --- Extraction des IOC depuis le raw_data Wazuh (best-effort multi-formats) ---
function extractIocs(raw: any): Ioc[] {
  const out: Ioc[] = [];
  const seen = new Set<string>();
  const push = (type: IocType, value?: string | null) => {
    if (!value) return;
    const v = String(value).trim();
    const key = `${type}:${v.toLowerCase()}`;
    if (!v || seen.has(key)) return;
    seen.add(key);
    out.push({ type, value: v });
  };

  const d = raw?.data ?? {};
  const win = d?.win?.eventdata ?? {};

  // Hashes (FIM syscheck, Sysmon, champ virustotal)
  push("hash", raw?.syscheck?.sha256_after);
  push("hash", raw?.syscheck?.md5_after);
  push("hash", d?.virustotal?.source?.sha1);
  if (typeof win.hashes === "string") {
    // format "MD5=...,SHA256=..."
    for (const part of win.hashes.split(",")) {
      const [, val] = part.split("=");
      if (val) push("hash", val);
    }
  }

  // IPs
  push("ip", d?.srcip);
  push("ip", d?.dstip);
  push("ip", win.sourceIp);
  push("ip", win.destinationIp);

  // Domaines / requêtes DNS
  push("domain", win.queryName);
  push("domain", d?.dns?.question?.name);

  // Filet de sécurité : balayage regex du JSON brut pour SHA256 et IPv4 publiques
  const blob = JSON.stringify(raw);
  for (const m of blob.matchAll(/\b[a-fA-F0-9]{64}\b/g)) push("hash", m[0]);
  for (const m of blob.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
    const ip = m[0];
    if (!/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|255\.)/.test(ip)) push("ip", ip);
  }

  return out.slice(0, MAX_IOCS_PER_ALERT);
}

// --- VirusTotal : nombre de moteurs antivirus qui détectent l'IOC ---
async function vtLookup(key: string, ioc: Ioc): Promise<number> {
  const path = ioc.type === "ip" ? `ip_addresses/${ioc.value}`
             : ioc.type === "domain" ? `domains/${ioc.value}`
             : `files/${ioc.value}`;
  try {
    const res = await fetch(`${VT_BASE}/${path}`, {
      headers: { "x-apikey": key },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 404) return 0; // inconnu de VT
    if (!res.ok) return 0;
    const data = await res.json();
    return Number(data?.data?.attributes?.last_analysis_stats?.malicious ?? 0);
  } catch {
    return 0;
  }
}

// --- MISP : l'IOC est-il déjà connu dans la threat intelligence ? ---
async function mispLookup(url: string, key: string, ioc: Ioc): Promise<{ known: boolean; threatName?: string }> {
  try {
    const res = await fetch(`${url}/attributes/restSearch`, {
      method: "POST",
      headers: { Authorization: key, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ returnFormat: "json", value: ioc.value, limit: 5 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { known: false };
    const data = await res.json();
    const attrs: any[] = data?.response?.Attribute ?? [];
    return { known: attrs.length > 0, threatName: attrs[0]?.Event?.info };
  } catch {
    return { known: false };
  }
}

// --- Calcul du verdict + score de risque (0-100) ---
function computeRisk(verdicts: IocVerdict[], ruleLevel: number): { verdict: string; score: number } {
  const maxVt = Math.max(0, ...verdicts.map((v) => v.vtMalicious));
  const mispHit = verdicts.some((v) => v.mispKnown);

  let score = Math.min(40, ruleLevel * 3); // contribution de la règle Wazuh (0-15 -> max 40)
  if (maxVt >= 10) score += 50;
  else if (maxVt >= 5) score += 40;
  else if (maxVt >= 1) score += 25;
  if (mispHit) score += 30;
  score = Math.min(100, score);

  let verdict = "clean";
  if (maxVt >= 5 || (mispHit && maxVt >= 1)) verdict = "malicious";
  else if (maxVt >= 1 || mispHit) verdict = "suspicious";
  else if (verdicts.length === 0) verdict = "unknown";

  return { verdict, score };
}

// --- Création d'un cas dans TheHive (cloisonné par tag d'organisation) ---
async function createTheHiveCase(
  url: string, key: string, alert: any, verdicts: IocVerdict[], risk: { verdict: string; score: number },
): Promise<string | null> {
  const sev = risk.score >= 85 ? 4 : risk.score >= 60 ? 3 : 2;
  const org = alert.organization ?? "unknown";
  const iocLines = verdicts.map((v) =>
    `- \`${v.value}\` (${v.type}) — VT: ${v.vtMalicious} détections${v.mispKnown ? `, MISP: connu (${v.threatName ?? "?"})` : ""}`
  ).join("\n");

  const body = {
    title: `[${org}] ${alert.title ?? "Alerte Wazuh"}`,
    description:
      `**Détection automatique SOC**\n\n` +
      `- Machine : ${alert.agent_name ?? "?"}\n` +
      `- Règle Wazuh : ${alert.rule_id ?? "?"} (niveau ${alert.severity})\n` +
      `- Verdict : **${risk.verdict}** (score ${risk.score}/100)\n\n` +
      `**Indicateurs analysés :**\n${iocLines || "Aucun IOC extrait."}`,
    severity: sev,
    tags: ["soc:auto", `org:${org}`, `machine:${alert.agent_name ?? "?"}`, `verdict:${risk.verdict}`],
  };

  try {
    const res = await fetch(`${url}/api/v1/case`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("TheHive case creation failed:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const created = await res.json();
    return String(created?._id ?? created?.id ?? "");
  } catch (e) {
    console.error("TheHive case error:", e);
    return null;
  }
}

async function enrichOne(supabase: any, alert: any, secrets: Record<string, string | undefined>) {
  const iocs = extractIocs(alert.raw_data ?? {});
  const verdicts: IocVerdict[] = [];

  for (const ioc of iocs) {
    const vtMalicious = secrets.VT ? await vtLookup(secrets.VT, ioc) : 0;
    const misp = secrets.MISP_URL && secrets.MISP_KEY
      ? await mispLookup(secrets.MISP_URL, secrets.MISP_KEY, ioc)
      : { known: false };
    verdicts.push({ ...ioc, vtMalicious, mispKnown: misp.known, threatName: misp.threatName });

    // Persiste l'IOC enrichi (cloisonné par organisation)
    await supabase.from("iocs").upsert({
      external_id: `alert:${alert.id}:${ioc.type}:${ioc.value}`,
      ioc_type: ioc.type,
      value: ioc.value,
      threat_name: misp.threatName ?? null,
      threat_level: vtMalicious >= 5 ? "high" : vtMalicious >= 1 || misp.known ? "medium" : "low",
      source: vtMalicious > 0 ? "virustotal" : misp.known ? "misp" : "wazuh",
      tags: [
        ...(vtMalicious > 0 ? [`vt:malicious=${vtMalicious}`] : []),
        ...(misp.known ? ["misp:known"] : []),
      ],
      organization: alert.organization ?? null,
      last_seen: new Date().toISOString(),
    }, { onConflict: "external_id" });
  }

  const risk = computeRisk(verdicts, Number(alert.severity ?? 5));

  // Création du cas TheHive si menace avérée/suspecte
  let caseId: string | null = null;
  if ((risk.verdict === "malicious" || risk.verdict === "suspicious") && secrets.TH_URL && secrets.TH_KEY) {
    caseId = await createTheHiveCase(secrets.TH_URL, secrets.TH_KEY, alert, verdicts, risk);
    if (caseId) {
      // Remonte immédiatement le cas dans la table (sans attendre sync-thehive-cases)
      await supabase.from("thehive_cases").upsert({
        external_id: caseId,
        title: `[${alert.organization ?? "?"}] ${alert.title ?? "Alerte"}`,
        description: `Cas auto-créé depuis l'alerte ${alert.id}`,
        severity: risk.score >= 85 ? 4 : risk.score >= 60 ? 3 : 2,
        status: "open",
        stage: "open",
        organization: alert.organization ?? null,
        raw_data: { auto: true, alert_id: alert.id },
      }, { onConflict: "external_id" });
    }
  }

  // Met à jour l'alerte avec le verdict
  await supabase.from("alerts").update({
    enriched_at: new Date().toISOString(),
    risk_score: risk.score,
    verdict: risk.verdict,
    thehive_case_id: caseId,
    status: risk.verdict === "malicious" ? "investigating" : alert.status,
  }).eq("id", alert.id);

  return { alert_id: alert.id, organization: alert.organization, iocs: iocs.length, ...risk, case_id: caseId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secrets = {
      VT: Deno.env.get("VIRUSTOTAL_API_KEY"),
      MISP_URL: Deno.env.get("MISP_URL"),
      MISP_KEY: Deno.env.get("MISP_API_KEY"),
      TH_URL: Deno.env.get("THEHIVE_URL"),
      TH_KEY: Deno.env.get("THEHIVE_API_KEY"),
    };

    const body = await req.json().catch(() => ({}));
    const supabase = serviceClient();

    // Sélection des alertes à enrichir
    let alerts: any[];
    if (body?.alert_id) {
      const { data, error } = await supabase.from("alerts").select("*").eq("id", body.alert_id).limit(1);
      if (error) throw error;
      alerts = data ?? [];
    } else {
      const limit = Math.min(Number(body?.limit ?? 5), 20);
      const { data, error } = await supabase
        .from("alerts").select("*")
        .is("enriched_at", null)
        .order("detected_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      alerts = data ?? [];
    }

    const results = [];
    for (const alert of alerts) {
      results.push(await enrichOne(supabase, alert, secrets));
    }

    return new Response(JSON.stringify({ enriched: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("soar-enrich-alert error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
