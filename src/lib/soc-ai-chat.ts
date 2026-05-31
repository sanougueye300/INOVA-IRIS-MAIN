import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { mockIncidentTimeline } from "@/lib/soc-mock";

export type SocAiMessage = { role: "user" | "assistant"; content: string };

const SOC_KEYWORDS =
  /\b(alerte|wazuh|misp|ioc|sigma|lql|shuffle|thehive|iris|mitre|incident|malware|phishing|firewall|ssh|powershell|dns|playbook|log|détection|detection|menace|vulnérabilité|brute|exfiltration|credential|virus|edr|siem|soc|sonatel|inova|enrichissement|remédiation|remediation|the.?hive|virus.?total)\b/i;

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

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(bonjour|bonsoir|salut|hello|hi|hey|coucou|bon matin|bonne journée)[\s!.?]*$/i.test(t);
}

function isThanks(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(merci|thanks|thank you|ok merci|parfait merci)[\s!.?]*$/i.test(t);
}

function isHelpRequest(text: string): boolean {
  return /\b(aide|help|que peux|qu'?est-ce que tu|comment tu peux|qui es-tu|tes capacités|que fais)\b/i.test(text);
}

function isSocRelated(text: string): boolean {
  return SOC_KEYWORDS.test(text);
}

function formatCriticalAlertSummary(): string {
  const critical =
    mockIncidentTimeline.find((i) => i.severity === "critical") ??
    mockIncidentTimeline[0];
  const when = new Date(critical.at).toLocaleString("fr-FR");
  return [
    "Voici la synthèse de la dernière alerte critique remontée sur le SOC :",
    "",
    `**${critical.title}**`,
    `- Gravité : ${critical.severity}`,
    `- Détectée le : ${when}`,
    `- Référence TheHive : ${critical.caseRef ?? "—"}`,
    "",
    "**Prochaines étapes recommandées**",
    "1. Isoler l'hôte concerné (segment Finance) et préserver les preuves.",
    "2. Collecter les logs PowerShell et lancer une acquisition mémoire (IRIS).",
    "3. Enrichir les indicateurs via MISP et VirusTotal.",
    "4. Mettre à jour le cas TheHive et notifier l'astreinte SOC.",
    "5. Ajuster ou créer une règle Sigma/LQL Wazuh si le scénario n'est pas couvert.",
  ].join("\n");
}

function replyGreeting(): string {
  return [
    "Bonjour. Je suis Djib'son, analyste IA du SOC Sonatel (INOVA-IRIS).",
    "",
    "Je peux vous assister sur l'analyse d'alertes, la rédaction de règles de détection, l'enrichissement d'IOC, les playbooks Shuffle et le suivi de cas TheHive.",
    "",
    "Comment puis-je vous aider aujourd'hui ?",
  ].join("\n");
}

function replyThanks(): string {
  return "Je vous en prie. N'hésitez pas si vous avez d'autres questions sur une alerte, un IOC ou une procédure de réponse à incident.";
}

function replyHelp(): string {
  return [
    "Je suis votre copilote analyste SOC. Voici ce que je peux traiter :",
    "",
    "• Analyse et priorisation d'alertes (Wazuh, corrélation MITRE)",
    "• Rédaction de règles Sigma / requêtes LQL",
    "• Enrichissement et comparaison d'IOC (MISP, VirusTotal)",
    "• Conception de playbooks Shuffle et suivi TheHive / IRIS",
    "• Recommandations de remédiation et réduction du bruit d'alertes",
    "",
    "Décrivez votre situation ou utilisez une action rapide ci-dessus.",
  ].join("\n");
}

function replyOffTopic(userText: string): string {
  const preview = userText.length > 80 ? `${userText.slice(0, 80)}…` : userText;
  return [
    "Je comprends votre question. En tant qu'analyste IA du SOC Sonatel, mon périmètre couvre la cybersécurité opérationnelle : détection, investigation, enrichissement et réponse à incident.",
    "",
    `Concernant « ${preview} », je ne suis pas le canal adapté pour ce sujet général.`,
    "",
    "En revanche, je peux vous aider si vous avez une alerte à analyser, un IOC à qualifier, une règle à rédiger ou un incident en cours. Que souhaitez-vous traiter en priorité ?",
  ].join("\n");
}

function replyGeneralSocOffer(): string {
  return [
    "Pour avancer efficacement, précisez le contexte : type d'alerte, système concerné (Windows, Linux, réseau), gravité perçue et outils déjà consultés (Wazuh, MISP, TheHive).",
    "",
    "Vous pouvez aussi utiliser les actions rapides (Sigma/LQL, alerte critique, Shuffle, IOC) pour un modèle de réponse structuré.",
  ].join("\n");
}

/** Réponses locales professionnelles quand l'API cloud n'est pas disponible. */
function localFallbackReply(messages: SocAiMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = last?.content ?? "";
  const qLower = q.toLowerCase();

  if (isGreeting(q)) return replyGreeting();
  if (isThanks(q)) return replyThanks();
  if (isHelpRequest(qLower)) return replyHelp();

  if (qLower.includes("alerte") && (qLower.includes("critique") || qLower.includes("résume") || qLower.includes("resume"))) {
    return formatCriticalAlertSummary();
  }

  if (qLower.includes("sigma") || qLower.includes("lql") || qLower.includes("wazuh")) {
    return [
      "Proposition de détection — PowerShell encodé (Windows) :",
      "",
      "**Règle Sigma**",
      "```yaml",
      "title: Suspicious Encoded PowerShell Command Line",
      "logsource:",
      "  product: windows",
      "  category: process_creation",
      "detection:",
      "  selection:",
      "    Image|endswith: '\\\\powershell.exe'",
      "    CommandLine|contains:",
      "      - '-enc'",
      "      - '-EncodedCommand'",
      "  condition: selection",
      "  level: high",
      "```",
      "",
      "**Requête LQL Wazuh** : `rule.groups:windows AND data.win.eventdata.commandLine:*-enc*`",
      "",
      "Pensez à tester en labo avant passage en production et à documenter les faux positifs connus.",
    ].join("\n");
  }

  if (qLower.includes("ioc") || qLower.includes("misp") || qLower.includes("203.0.113")) {
    return [
      "Analyse comparative des IOC demandés :",
      "",
      "| Indicateur | Type | Actions recommandées |",
      "|------------|------|----------------------|",
      "| 203.0.113.44 | IPv4 | Réputation VT/MISP, corrélation logs 24–72 h, blocage pare-feu si malveillant |",
      "| evil-update.net | FQDN | Analyse passive DNS, blocage proxy/DNS, règle de détection sortie DNS |",
      "",
      "Escaladez vers un cas TheHive si corrélation avec une alerte active ou impact métier confirmé.",
    ].join("\n");
  }

  if (qLower.includes("shuffle") || qLower.includes("playbook") || qLower.includes("dns") || qLower.includes("exfiltration")) {
    return [
      "Playbook Shuffle proposé — suspicion d'exfiltration DNS :",
      "",
      "1. **Déclencheur** : alerte Wazuh (volume DNS anormal ou domaine à faible réputation)",
      "2. **Enrichissement** : MISP + VirusTotal sur le FQDN et résolution passive",
      "3. **Containment** : blocage DNS/proxy si score de menace élevé",
      "4. **Ticket** : création ou mise à jour cas TheHive avec IOC et timeline",
      "5. **Clôture** : tuning de règle et retour d'expérience SOC",
    ].join("\n");
  }

  if (!isSocRelated(q)) {
    return replyOffTopic(q);
  }

  return replyGeneralSocOffer();
}

function shouldUseLocalFallback(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not_found") ||
    m.includes("requested function was not found") ||
    m.includes("lovable_api_key") ||
    m.includes("ai_key_missing") ||
    m.includes("gemini_api_key") ||
    m.includes("failed to send a request to the edge function") ||
    m.includes("failed to fetch")
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

/** Envoie l'historique au chat IA SOC (API serveur → Supabase → repli local). */
export async function sendSocAiChat(messages: SocAiMessage[]): Promise<string> {
  const payload = messages.map(({ role, content }) => ({ role, content }));

  try {
    return await callAppApiRoute(payload);
  } catch (apiErr) {
    const apiMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
    if (!shouldUseLocalFallback(apiMsg)) {
      throw apiErr instanceof Error ? apiErr : new Error(apiMsg);
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke("soc-ai-chat", {
      body: { messages: payload },
    });

    if (error) {
      const msg = await parseFunctionError(error);
      if (shouldUseLocalFallback(msg)) return localFallbackReply(messages);
      throw new Error(msg);
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
      const errMsg = String(data.error);
      if (shouldUseLocalFallback(errMsg)) return localFallbackReply(messages);
      throw new Error(errMsg);
    }

    const reply = data?.reply;
    if (typeof reply === "string" && reply.trim()) return reply;
  } catch (e: unknown) {
    const msg = await parseFunctionError(e);
    if (shouldUseLocalFallback(msg)) return localFallbackReply(messages);
    throw new Error(msg);
  }

  return localFallbackReply(messages);
}
