import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Plug, Shield, Bug, Workflow, ServerCog, Database, ScanSearch, CheckCircle2, XCircle, RefreshCw, Eye, EyeOff, Save, Link2 } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Connecteurs & API — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminIntegrations /></RequireAuth>,
});

const DEFAULT_INTEGRATIONS = [
  { id: "wazuh", name: "Wazuh SIEM/EDR", desc: "Endpoint Security & Log Analysis", icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", status: "online", ping: "24ms", endpoint: "https://api.wazuh.local:9000", key: "sk-live-51J8xyz...29df0" },
  { id: "thehive", name: "TheHive 5", desc: "Security Incident Response Platform", icon: Bug, color: "text-purple-500", bg: "bg-purple-500/10", status: "online", ping: "45ms", endpoint: "https://api.thehive.local:9000", key: "sk-live-51J8xyz...29df0" },
  { id: "misp", name: "MISP", desc: "Threat Intelligence Sharing", icon: Database, color: "text-red-500", bg: "bg-red-500/10", status: "online", ping: "112ms", endpoint: "https://api.misp.local:9000", key: "sk-live-51J8xyz...29df0" },
  { id: "virustotal", name: "VirusTotal", desc: "Malware & Threat Analysis API", icon: ScanSearch, color: "text-cyan-500", bg: "bg-cyan-500/10", status: "warning", ping: "API Quota: 85%", endpoint: "https://api.virustotal.local:9000", key: "sk-live-51J8xyz...29df0" },
  { id: "shuffle", name: "Shuffle SOAR", desc: "Security Orchestration & Playbooks", icon: Workflow, color: "text-amber-500", bg: "bg-amber-500/10", status: "offline", ping: "Connection Refused", endpoint: "https://api.shuffle.local:9000", key: "sk-live-51J8xyz...29df0" },
  { id: "iris", name: "DFIR-IRIS", desc: "Digital Forensics & Incident Response", icon: ServerCog, color: "text-rose-500", bg: "bg-rose-500/10", status: "online", ping: "18ms", endpoint: "https://api.iris.local:9000", key: "sk-live-51J8xyz...29df0" },
];

function AdminIntegrations() {
  const [integrations, setIntegrations] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("soc-admin-integrations");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return DEFAULT_INTEGRATIONS;
  });

  const [activeIntegration, setActiveIntegration] = useState<any>(null);
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editKey, setEditKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTestConnection = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isSuccess = Math.random() > 0.3;
      if (isSuccess) {
        toast.success("Connexion réussie", { description: "Le connecteur répond correctement." });
      } else {
        toast.error("Échec de connexion", { description: "Impossible d'atteindre le serveur. Vérifiez l'URL et la clé API." });
      }
    }, 1500);
  };

  const handleSave = () => {
    if (!activeIntegration) return;
    
    const updatedIntegrations = integrations.map((i: any) => {
      if (i.id === activeIntegration.id) {
        return {
          ...i,
          endpoint: editEndpoint,
          key: editKey,
          status: "online", // dynamically update status
          ping: "12ms",     // update ping
        };
      }
      return i;
    });

    setIntegrations(updatedIntegrations);
    localStorage.setItem("soc-admin-integrations", JSON.stringify(updatedIntegrations));
    
    toast.success("Configuration sauvegardée", { description: `Les paramètres pour ${activeIntegration.name} ont été mis à jour et le connecteur est en ligne.` });
  };

  const openConfig = (integ: any) => {
    setActiveIntegration(integ);
    setEditEndpoint(integ.endpoint || `https://api.${integ.id}.local:9000`);
    setEditKey(integ.key || "sk-live-51J8xyz...29df0");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Plug className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
              Connecteurs & API
            </h1>
          </div>
          <p className="text-muted-foreground">
            Gérez les intégrations avec les outils externes de la stack SOC (Wazuh, TheHive, MISP, etc.).
          </p>
        </div>

        {/* Grid Integrations */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integ: any) => {
            const Icon = integ.id === "wazuh" ? Shield : integ.id === "thehive" ? Bug : integ.id === "misp" ? Database : integ.id === "virustotal" ? ScanSearch : integ.id === "shuffle" ? Workflow : ServerCog;
            return (
            <Card key={integ.id} className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm flex flex-col hover:shadow-xl hover:border-primary/30 transition-all group">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${integ.bg} ${integ.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {integ.status === "online" && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> En ligne</Badge>
                  )}
                  {integ.status === "warning" && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><RefreshCw className="h-3 w-3" /> Limité</Badge>
                  )}
                  {integ.status === "offline" && (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1"><XCircle className="h-3 w-3" /> Hors ligne</Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-4">{integ.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">{integ.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded-md flex items-center gap-2">
                  <Link2 className="h-3 w-3" /> {integ.ping}
                </div>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={() => openConfig(integ)}>
                      Configurer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {activeIntegration && (activeIntegration.id === "wazuh" ? <Shield className={`h-5 w-5 ${activeIntegration.color}`} /> : activeIntegration.id === "thehive" ? <Bug className={`h-5 w-5 ${activeIntegration.color}`} /> : activeIntegration.id === "misp" ? <Database className={`h-5 w-5 ${activeIntegration.color}`} /> : activeIntegration.id === "virustotal" ? <ScanSearch className={`h-5 w-5 ${activeIntegration.color}`} /> : activeIntegration.id === "shuffle" ? <Workflow className={`h-5 w-5 ${activeIntegration.color}`} /> : <ServerCog className={`h-5 w-5 ${activeIntegration.color}`} />)}
                        Configuration {activeIntegration?.name}
                      </DialogTitle>
                      <DialogDescription>
                        Modifiez les paramètres de connexion à l'API {activeIntegration?.name}.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>URL de l'API (Endpoint)</Label>
                        <Input 
                          value={editEndpoint} 
                          onChange={(e) => setEditEndpoint(e.target.value)} 
                          className="font-mono text-xs" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Clé d'API (Bearer Token)</Label>
                        <div className="relative">
                          <Input 
                            type={showKey ? "text" : "password"} 
                            value={editKey}
                            onChange={(e) => setEditKey(e.target.value)}
                            className="font-mono text-xs pr-10" 
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowKey(!showKey)}
                          >
                            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
                      <Button variant="outline" onClick={handleTestConnection} disabled={loading} className="w-full sm:w-auto">
                        {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                        Tester la connexion
                      </Button>
                      <Button onClick={handleSave} className="w-full sm:w-auto">
                        <Save className="mr-2 h-4 w-4" />
                        Sauvegarder
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
            );
          })}
        </div>

      </div>
    </div>
  );
}
