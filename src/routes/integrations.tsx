import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import {
  Plug, Shield, Bug, Workflow, ServerCog, Database, ScanSearch,
  CheckCircle2, XCircle, RefreshCw, Eye, EyeOff, Save, Link2,
  AlertTriangle, Info,
} from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Connecteurs & API — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminIntegrations /></RequireAuth>,
});

// Statuts réels retournés par la Edge Function check-connector
type ConnectorStatus = "online" | "offline" | "warning" | "checking" | "unconfigured";

interface ConnectorConfig {
  id: string;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  docsUrl: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const CONNECTOR_DEFS: ConnectorConfig[] = [
  {
    id: "wazuh",
    name: "Wazuh SIEM/EDR",
    desc: "Endpoint Security & Log Analysis",
    icon: Shield,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    docsUrl: "https://documentation.wazuh.com/current/user-manual/api/getting-started.html",
    fields: [
      { key: "WAZUH_URL", label: "URL de l'API (ex: https://IP:55000)", placeholder: "https://your-vps-ip:55000" },
      { key: "WAZUH_USER", label: "Utilisateur API", placeholder: "wazuh-wui" },
      { key: "WAZUH_PASSWORD", label: "Mot de passe API", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "thehive",
    name: "TheHive 5",
    desc: "Security Incident Response Platform",
    icon: Bug,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    docsUrl: "https://docs.strangebee.com/thehive/api-docs/",
    fields: [
      { key: "THEHIVE_URL", label: "URL TheHive (ex: https://IP:9000)", placeholder: "https://your-vps-ip:9000" },
      { key: "THEHIVE_API_KEY", label: "Clé API", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "misp",
    name: "MISP",
    desc: "Threat Intelligence Sharing",
    icon: Database,
    color: "text-red-500",
    bg: "bg-red-500/10",
    docsUrl: "https://www.misp-project.org/openapi/",
    fields: [
      { key: "MISP_URL", label: "URL MISP (ex: https://misp.domain.com)", placeholder: "https://your-misp-instance" },
      { key: "MISP_API_KEY", label: "Auth Key (Automation)", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    desc: "Malware & Threat Analysis API",
    icon: ScanSearch,
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    docsUrl: "https://docs.virustotal.com/reference/overview",
    fields: [
      { key: "VIRUSTOTAL_API_KEY", label: "Clé API VirusTotal", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "shuffle",
    name: "Shuffle SOAR",
    desc: "Security Orchestration & Playbooks",
    icon: Workflow,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    docsUrl: "https://shuffler.io/docs/API",
    fields: [
      { key: "SHUFFLE_URL", label: "URL Shuffle (ex: http://IP:3001)", placeholder: "http://your-vps-ip:3001" },
      { key: "SHUFFLE_API_KEY", label: "Clé API", placeholder: "••••••••", type: "password" },
    ],
  },
  {
    id: "iris",
    name: "DFIR-IRIS",
    desc: "Digital Forensics & Incident Response",
    icon: ServerCog,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    docsUrl: "https://docs.dfir-iris.org/operations/api/",
    fields: [
      { key: "IRIS_URL", label: "URL IRIS (ex: https://iris.domain.com)", placeholder: "https://your-iris-instance" },
      { key: "IRIS_API_KEY", label: "Clé API", placeholder: "••••••••", type: "password" },
    ],
  },
];

// Statuts persistés localement (les vrais statuts viennent de la Edge Function)
interface PersistedConnector {
  id: string;
  configured: boolean;
  lastChecked: string | null;
  status: ConnectorStatus;
  latencyMs: number | null;
  message: string;
}

function loadPersistedConnectors(): Record<string, PersistedConnector> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("soc-connector-status");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePersistedConnectors(data: Record<string, PersistedConnector>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("soc-connector-status", JSON.stringify(data));
}

function AdminIntegrations() {
  const [statuses, setStatuses] = useState<Record<string, PersistedConnector>>(loadPersistedConnectors);
  const [activeConnector, setActiveConnector] = useState<ConnectorConfig | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [checkingAll, setCheckingAll] = useState(false);

  // Récupère le client Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

  const checkConnector = async (connectorId: string) => {
    if (!supabase) {
      toast.error("Supabase non configuré", { description: "VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis." });
      return;
    }

    setStatuses((prev) => ({
      ...prev,
      [connectorId]: { ...prev[connectorId], id: connectorId, status: "checking", latencyMs: null, message: "Vérification…", lastChecked: null, configured: prev[connectorId]?.configured ?? false },
    }));

    try {
      const { data, error } = await supabase.functions.invoke("check-connector", {
        body: { connector: connectorId },
      });

      if (error) throw error;

      const result = data?.results?.[0];
      if (!result) throw new Error("Aucun résultat retourné");

      const updated: PersistedConnector = {
        id: connectorId,
        configured: result.status !== "offline" || result.message !== "Variables manquantes",
        lastChecked: new Date().toISOString(),
        status: result.status,
        latencyMs: result.latencyMs,
        message: result.message,
      };

      setStatuses((prev) => {
        const next = { ...prev, [connectorId]: updated };
        savePersistedConnectors(next);
        return next;
      });

      if (result.status === "online") {
        toast.success(`${connectorId} — Connexion réussie`, { description: result.message });
      } else if (result.status === "warning") {
        toast.warning(`${connectorId} — Avertissement`, { description: result.message });
      } else {
        toast.error(`${connectorId} — Hors ligne`, { description: result.message });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatuses((prev) => {
        const next = {
          ...prev,
          [connectorId]: {
            id: connectorId,
            configured: prev[connectorId]?.configured ?? false,
            lastChecked: new Date().toISOString(),
            status: "offline" as ConnectorStatus,
            latencyMs: null,
            message: msg,
          },
        };
        savePersistedConnectors(next);
        return next;
      });
      toast.error(`Erreur — ${connectorId}`, { description: msg });
    }
  };

  const checkAllConnectors = async () => {
    if (!supabase) {
      toast.error("Supabase non configuré");
      return;
    }
    setCheckingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-connector", {
        body: { connector: "all" },
      });
      if (error) throw error;

      const results: any[] = data?.results ?? [];
      const updates: Record<string, PersistedConnector> = {};
      for (const r of results) {
        updates[r.id] = {
          id: r.id,
          configured: r.status !== "offline" || r.message !== "Variables manquantes",
          lastChecked: new Date().toISOString(),
          status: r.status,
          latencyMs: r.latencyMs,
          message: r.message,
        };
      }
      setStatuses((prev) => {
        const next = { ...prev, ...updates };
        savePersistedConnectors(next);
        return next;
      });

      const online = results.filter((r) => r.status === "online").length;
      toast.success(`Vérification terminée`, { description: `${online}/${results.length} connecteurs en ligne` });
    } catch (e) {
      toast.error("Erreur lors de la vérification globale", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setCheckingAll(false);
    }
  };

  const openConfig = (def: ConnectorConfig) => {
    setActiveConnector(def);
    setFieldValues({});
    setShowSecrets({});
  };

  const handleSave = () => {
    if (!activeConnector) return;
    // Les clés API sont des secrets serveur gérés via Supabase Secrets ou variables d'environnement.
    // Ici on indique à l'utilisateur où les configurer.
    toast.info("Configuration des secrets", {
      description: "Les clés API doivent être définies dans Supabase Dashboard → Edge Functions → Secrets, ou via : npx supabase secrets set CLE=valeur",
      duration: 8000,
    });
  };

  const getStatusBadge = (connectorId: string) => {
    const s = statuses[connectorId];
    if (!s) return <Badge variant="outline" className="text-muted-foreground border-muted gap-1"><Info className="h-3 w-3" /> Non vérifié</Badge>;

    switch (s.status) {
      case "online":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> En ligne</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><AlertTriangle className="h-3 w-3" /> Limité</Badge>;
      case "offline":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1"><XCircle className="h-3 w-3" /> Hors ligne</Badge>;
      case "checking":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Vérification…</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-muted gap-1"><Info className="h-3 w-3" /> Non vérifié</Badge>;
    }
  };

  const getPingDisplay = (connectorId: string) => {
    const s = statuses[connectorId];
    if (!s || !s.lastChecked) return "Jamais vérifié";
    if (s.status === "checking") return "Vérification en cours…";
    return s.message ?? (s.latencyMs ? `${s.latencyMs}ms` : "—");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Plug className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Connecteurs & API
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={checkAllConnectors}
              disabled={checkingAll}
              className="gap-2"
            >
              {checkingAll
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
              Vérifier tous
            </Button>
          </div>
          <p className="text-muted-foreground">
            Gérez et testez les connexions avec les outils de la stack SOC.
            Les clés API sont stockées en secrets Supabase Edge Functions — jamais côté client.
          </p>
        </div>

        {/* Bannière d'info configuration */}
        {!supabase && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <strong>Supabase non configuré</strong> — Les tests de connexion réels nécessitent{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">VITE_SUPABASE_URL</code> et{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> dans votre fichier <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env.local</code>.
            </div>
          </div>
        )}

        {/* Grid Connecteurs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECTOR_DEFS.map((def) => {
            const Icon = def.icon;
            return (
              <Card
                key={def.id}
                className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm flex flex-col hover:shadow-xl hover:border-primary/30 transition-all group"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-xl ${def.bg} ${def.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {getStatusBadge(def.id)}
                  </div>
                  <CardTitle className="text-lg mt-4">{def.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-[40px]">{def.desc}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-2">
                  <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded-md flex items-center gap-2">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{getPingDisplay(def.id)}</span>
                  </div>
                  {statuses[def.id]?.lastChecked && (
                    <p className="text-xs text-muted-foreground">
                      Dernière vérification :{" "}
                      {new Date(statuses[def.id].lastChecked!).toLocaleTimeString("fr-FR")}
                    </p>
                  )}
                </CardContent>

                <CardFooter className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    disabled={statuses[def.id]?.status === "checking"}
                    onClick={() => checkConnector(def.id)}
                  >
                    {statuses[def.id]?.status === "checking"
                      ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <Plug className="mr-1.5 h-3.5 w-3.5" />}
                    Tester
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={() => openConfig(def)}
                      >
                        Configurer
                      </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {activeConnector && (
                            <activeConnector.icon className={`h-5 w-5 ${activeConnector.color}`} />
                          )}
                          Configuration {activeConnector?.name}
                        </DialogTitle>
                        <DialogDescription>
                          Les secrets sont stockés dans <strong>Supabase Edge Functions Secrets</strong>, jamais dans le code ou le navigateur.
                        </DialogDescription>
                      </DialogHeader>

                      {activeConnector && (
                        <div className="space-y-4 py-2">
                          {/* Lien documentation */}
                          <a
                            href={activeConnector.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Documentation API {activeConnector.name}
                          </a>

                          {/* Champs de configuration */}
                          {activeConnector.fields.map((field) => (
                            <div key={field.key} className="space-y-2">
                              <Label className="text-sm">
                                {field.label}
                                <code className="ml-2 text-xs font-mono bg-muted px-1 rounded text-muted-foreground">
                                  {field.key}
                                </code>
                              </Label>
                              <div className="relative">
                                <Input
                                  type={field.type === "password" && !showSecrets[field.key] ? "password" : "text"}
                                  placeholder={field.placeholder}
                                  value={fieldValues[field.key] ?? ""}
                                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  className="font-mono text-xs pr-10"
                                />
                                {field.type === "password" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowSecrets((p) => ({ ...p, [field.key]: !p[field.key] }))}
                                  >
                                    {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Instructions CLI */}
                          <div className="rounded-lg bg-muted/60 p-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Commande pour définir les secrets :</p>
                            <code className="text-xs font-mono block whitespace-pre-wrap text-foreground/80">
                              {activeConnector.fields
                                .map((f) => `npx supabase secrets set ${f.key}=VALEUR`)
                                .join("\n")}
                            </code>
                          </div>
                        </div>
                      )}

                      <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                        <Button
                          variant="outline"
                          onClick={() => activeConnector && checkConnector(activeConnector.id)}
                          disabled={statuses[activeConnector?.id ?? ""]?.status === "checking"}
                          className="w-full sm:w-auto"
                        >
                          <Plug className="mr-2 h-4 w-4" />
                          Tester la connexion
                        </Button>
                        <Button onClick={handleSave} className="w-full sm:w-auto">
                          <Save className="mr-2 h-4 w-4" />
                          Voir les instructions
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Guide rapide */}
        <div className="rounded-xl border border-border/50 bg-white/50 dark:bg-zinc-950/50 p-6 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            Guide de connexion rapide
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Installez vos outils SOC sur un <strong className="text-foreground">VPS Linux dédié</strong> (Hetzner, OVH, DigitalOcean…) — pas sur votre machine locale.</li>
            <li>Ouvrez les ports nécessaires : <code className="font-mono bg-muted px-1 rounded">55000</code> (Wazuh), <code className="font-mono bg-muted px-1 rounded">9000</code> (TheHive), <code className="font-mono bg-muted px-1 rounded">443</code> (MISP), <code className="font-mono bg-muted px-1 rounded">3001</code> (Shuffle).</li>
            <li>Récupérez les clés API depuis chaque outil et définissez-les via <code className="font-mono bg-muted px-1 rounded">npx supabase secrets set CLE=valeur</code>.</li>
            <li>Déployez les Edge Functions : <code className="font-mono bg-muted px-1 rounded">npx supabase functions deploy check-connector</code></li>
            <li>Cliquez <strong className="text-foreground">Tester</strong> sur chaque connecteur pour vérifier la connexion en temps réel.</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
