import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

/** Réponses locales quand l'Edge Function n'est pas déployée ou sans clé API. */
function localFallbackReply(messages: SocAiMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = (last?.content ?? "").toLowerCase();

  if (q.includes("sigma") || q.includes("lql") || q.includes("wazuh")) {
    return [
      "**Mode démo (API IA hors ligne)**",
      "",
      "Exemple Sigma (PowerShell encodé) :",
      "```yaml",
      "title: Suspicious Encoded PowerShell",
      "logsource: { product: windows, category: process_creation }",
      "detection:",
      "  selection:",
      "    Image|endswith: '\\powershell.exe'",
      "    CommandLine|contains: ['-enc', '-EncodedCommand']",
      "  condition: selection",
      "```",
      "",
      "LQL Wazuh : `rule.groups:windows AND data.win.eventdata.commandLine:*-enc*`",
      "",
      "Déployez `soc-ai-chat` sur Supabase avec `LOVABLE_API_KEY` pour des réponses générées par IA.",
    ].join("\n");
  }

  if (q.includes("ioc") || q.includes("misp")) {
    return [
      "**Mode démo** — Comparaison IOC :",
      "- `203.0.113.44` : vérifier réputation VT/MISP, corréler avec alertes Wazuh.",
      "- `evil-update.net` : domaine — recherche passive DNS, blocage proxy, règle Sigma sortie DNS.",
      "",
      "Actions : enrichissement MISP, tag `tlp:amber`, ouverture cas TheHive si score > seuil.",
    ].join("\n");
  }

  if (q.includes("shuffle") || q.includes("playbook")) {
    return [
      "**Mode démo** — Playbook Shuffle suggéré :",
      "1. Trigger alerte Wazuh (SSH brute force / credential stuffing)",
      "2. Enrichissement VirusTotal + MISP",
      "3. Si score élevé → blocage IP pare-feu + ticket TheHive",
      "4. Notification équipe SOC Sonatel",
    ].join("\n");
  }

  return [
    "**Assistant SOC (mode démo)**",
    "",
    "L'API `soc-ai-chat` n'est pas disponible. Causes fréquentes :",
    "- Edge Function non déployée sur Supabase",
    "- Secret `LOVABLE_API_KEY` manquant",
    "",
    "Déploiement :",
    "```bash",
    "npx supabase login",
    "npx supabase functions deploy soc-ai-chat --project-ref pdzxabmqrlukhngnrkki",
    "npx supabase secrets set LOVABLE_API_KEY=votre_cle",
    "```",
    "",
    "En attendant, décrivez votre alerte : je peux vous guider sur tri MITRE, enrichissement MISP et cas TheHive.",
  ].join("\n");
}

function shouldUseLocalFallback(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not_found") ||
    m.includes("requested function was not found") ||
    m.includes("lovable_api_key manquant") ||
    m.includes("failed to send a request to the edge function")
  );
}

/** Envoie l'historique au chat IA SOC (Edge Function ou repli local). */
export async function sendSocAiChat(messages: SocAiMessage[]): Promise<string> {
  const payload = messages.map(({ role, content }) => ({ role, content }));

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
    return "(réponse vide)";
  } catch (e: unknown) {
    const msg = await parseFunctionError(e);
    if (shouldUseLocalFallback(msg)) return localFallbackReply(messages);
    throw new Error(msg);
  }
}
