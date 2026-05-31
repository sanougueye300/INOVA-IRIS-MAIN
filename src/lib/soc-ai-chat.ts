import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mockIncidentTimeline } from "@/lib/soc-mock";

export type SocAiMessage = { role: "user" | "assistant"; content: string };

async function parseFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      /* ignore */
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Erreur inconnue";
}

function formatCriticalAlertSummary(): string {
  const critical =
    mockIncidentTimeline.find((i) => i.severity === "critical") ??
    mockIncidentTimeline[0];
  const when = new Date(critical.at).toLocaleString("fr-FR");
  return [
    "**Dernière alerte critique (données SOC démo)**",
    "",
    `**${critical.title}**`,
    `- Gravité : ${critical.severity}`,
    `- Horodatage : ${when}`,
    `- Cas TheHive : ${critical.caseRef ?? "—"}`,
    "",
    "**Prochaines étapes recommandées**",
    "1. Isoler l'hôte concerné (segment réseau Finance).",
    "2. Collecter logs PowerShell + image mémoire (IRIS).",
    "3. Enrichir IOC via MISP / VirusTotal.",
    "4. Ouvrir ou mettre à jour le cas TheHive et notifier l'astreinte.",
    "5. Déployer une règle Sigma/LQL Wazuh si non couverte.",
    "",
    "_Pour une analyse IA générative en temps réel, ajoutez `LOVABLE_API_KEY` (Vercel ou Supabase) et déployez `soc-ai-chat`._",
  ].join("\n");
}

/** Réponses locales quand l'API cloud n'est pas disponible. */
function localFallbackReply(messages: SocAiMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = (last?.content ?? "").toLowerCase();

  if (q.includes("alerte") && (q.includes("critique") || q.includes("résume") || q.includes("resume"))) {
    return formatCriticalAlertSummary();
  }

  if (q.includes("sigma") || q.includes("lql") || q.includes("wazuh")) {
    return [
      "**Règle de détection (mode démo)**",
      "",
      "Sigma — PowerShell encodé :",
      "```yaml",
      "title: Suspicious Encoded PowerShell",
      "logsource: { product: windows, category: process_creation }",
      "detection:",
      "  selection:",
      "    Image|endswith: '\\\\powershell.exe'",
      "    CommandLine|contains: ['-enc', '-EncodedCommand']",
      "  condition: selection",
      "  level: high",
      "```",
      "",
      "LQL Wazuh : `rule.groups:windows AND data.win.eventdata.commandLine:*-enc*`",
    ].join("\n");
  }

  if (q.includes("ioc") || q.includes("misp") || q.includes("203.0.113")) {
    return [
      "**Comparaison IOC (mode démo)**",
      "",
      "| IOC | Type | Actions |",
      "|-----|------|---------|",
      "| 203.0.113.44 | IP | VT, MISP, blocage pare-feu si malveillant |",
      "| evil-update.net | Domaine | DNS sinkhole, proxy, Sigma sortie DNS |",
      "",
      "Corréler avec alertes Wazuh des dernières 24 h avant escalade TheHive.",
    ].join("\n");
  }

  if (q.includes("shuffle") || q.includes("playbook") || q.includes("dns") || q.includes("exfiltration")) {
    return [
      "**Playbook Shuffle — exfiltration DNS (mode démo)**",
      "",
      "1. Trigger : alerte Wazuh (volume DNS anormal / domaine suspect)",
      "2. Enrichissement MISP + VirusTotal sur le FQDN",
      "3. Si score > seuil → blocage DNS + ticket TheHive",
      "4. Notification Slack/Teams SOC Sonatel",
      "5. Post-incident : tuning règle pour réduire faux positifs",
    ].join("\n");
  }

  return [
    "**Assistant SOC (mode démo)**",
    "",
    "Je peux vous aider sur les alertes Wazuh, IOC/MISP, playbooks Shuffle et cas TheHive.",
    "Essayez une action rapide (Sigma, alerte critique, Shuffle, IOC).",
    "",
    "Pour l'IA générative : configurez `LOVABLE_API_KEY` dans `.env` (dev) ou Vercel/Supabase (prod).",
  ].join("\n");
}

function shouldUseLocalFallback(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not_found") ||
    m.includes("requested function was not found") ||
    m.includes("lovable_api_key") ||
    m.includes("failed to send a request to the edge function")
  );
}

async function callAppApiRoute(messages: SocAiMessage[]): Promise<string> {
  const res = await fetch("/api/soc-ai-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = (await res.json()) as { reply?: string; error?: string };
  if (!res.ok || data.error) {
    if (data.error && shouldUseLocalFallback(data.error)) {
      return localFallbackReply(messages);
    }
    throw new Error(data.error ?? `API ${res.status}`);
  }
  return data.reply?.trim() || "(réponse vide)";
}

/** Envoie l'historique au chat IA SOC (Supabase, API Nitro, ou repli local). */
export async function sendSocAiChat(messages: SocAiMessage[]): Promise<string> {
  const payload = messages.map(({ role, content }) => ({ role, content }));

  try {
    const { data, error } = await supabase.functions.invoke("soc-ai-chat", {
      body: { messages: payload },
    });

    if (error) {
      const msg = await parseFunctionError(error);
      if (shouldUseLocalFallback(msg)) {
        try {
          return await callAppApiRoute(payload);
        } catch {
          return localFallbackReply(messages);
        }
      }
      throw new Error(msg);
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
      const errMsg = String(data.error);
      if (shouldUseLocalFallback(errMsg)) {
        try {
          return await callAppApiRoute(payload);
        } catch {
          return localFallbackReply(messages);
        }
      }
      throw new Error(errMsg);
    }

    const reply = data?.reply;
    if (typeof reply === "string" && reply.trim()) return reply;
    return "(réponse vide)";
  } catch (e: unknown) {
    const msg = await parseFunctionError(e);
    if (shouldUseLocalFallback(msg)) {
      try {
        return await callAppApiRoute(payload);
      } catch {
        return localFallbackReply(messages);
      }
    }
    throw new Error(msg);
  }
}
