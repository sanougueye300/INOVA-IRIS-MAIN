import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { useSocPreferences } from "@/lib/soc-preferences";
import { 
  Sliders, ShieldCheck, PaintBucket, HardDrive, Save, Upload, Moon, Sun, 
  Brain, Globe, RefreshCw, AlertTriangle, FileText, Database, ShieldAlert, Cpu, Sparkles
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres Globaux — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminSettings /></RequireAuth>,
});

function AdminSettings() {
  const { theme, setTheme } = useSocPreferences();
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("soc-admin-settings");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return {
      tenantName: "Sonatel Group",
      primaryColor: "blue",
      retentionLogs: 90,
      retentionAlerts: 180,
      forceMfa: true,
      sessionTimeout: "30",
      logoBase64: "",
      
      // Djib'son IA settings
      aiAutonomousSoar: false,
      aiConfidenceThreshold: 85,
      aiModelEngine: "claude-3-5",
      aiSystemLanguage: "fr",
      
      // Sécurité & Réseau
      ipWhitelist: "10.0.0.0/8, 192.168.1.0/24, 196.207.240.0/20",
      blockHighRiskCountries: true,
      ctiFeedSource: "alienvault",
      
      // SIEM & Sync
      alertStormProtection: true,
      stormThreshold: 150,
      syncInterval: 30,
      
      // Audit & Webhooks
      auditWebhookUrl: "https://api.sonatel.soc/v1/audit-logs",
      auditVerbosity: "medium",
    };
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Fichier trop volumineux", {
          description: "La taille du logo ne doit pas dépasser 2 Mo."
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSettings((prev: any) => ({ ...prev, logoBase64: base64 }));
        toast.success("Logo importé", {
          description: "Cliquez sur 'Appliquer les changements' pour enregistrer."
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);
    // Simulate API call and save to localStorage
    setTimeout(() => {
      localStorage.setItem("soc-admin-settings", JSON.stringify(settings));
      setSaving(false);
      window.dispatchEvent(new Event("soc-logo-updated"));
      toast.success("Paramètres mis à jour", {
        description: "Les nouveaux paramètres globaux de dernière génération ont été appliqués avec succès.",
      });
    }, 800);
  };

  const handleRestore = () => {
    const defaultSettings = {
      tenantName: "Sonatel Group",
      primaryColor: "blue",
      retentionLogs: 90,
      retentionAlerts: 180,
      forceMfa: true,
      sessionTimeout: "30",
      logoBase64: "",
      aiAutonomousSoar: false,
      aiConfidenceThreshold: 85,
      aiModelEngine: "claude-3-5",
      aiSystemLanguage: "fr",
      ipWhitelist: "10.0.0.0/8, 192.168.1.0/24, 196.207.240.0/20",
      blockHighRiskCountries: true,
      ctiFeedSource: "alienvault",
      alertStormProtection: true,
      stormThreshold: 150,
      syncInterval: 30,
      auditWebhookUrl: "https://api.sonatel.soc/v1/audit-logs",
      auditVerbosity: "medium",
    };
    setSettings(defaultSettings);
    setTimeout(() => {
      window.dispatchEvent(new Event("soc-logo-updated"));
    }, 100);
    toast.success("Paramètres restaurés", {
      description: "Les valeurs d'usine par défaut ont été rechargées.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sliders className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
              Paramètres Globaux
            </h1>
          </div>
          <p className="text-muted-foreground">
            Configurez l'environnement de sécurité multi-tenant, l'IA autonome, l'image de marque et la protection SIEM.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          
          {/* Main settings options using Tabs (Left side) */}
          <div className="md:col-span-8 space-y-6">
            <Tabs defaultValue="appearance" className="space-y-6">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm p-1 rounded-xl gap-1 border border-border/30 h-auto">
                <TabsTrigger value="appearance" className="gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-sm transition-all text-xs">
                  <PaintBucket className="h-3.5 w-3.5 text-primary" />
                  <span>Design</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-sm transition-all text-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Sécurité</span>
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-sm transition-all text-xs">
                  <Brain className="h-3.5 w-3.5 text-purple-500" />
                  <span>Djib'son IA</span>
                </TabsTrigger>
                <TabsTrigger value="siem" className="gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-sm transition-all text-xs">
                  <Cpu className="h-3.5 w-3.5 text-amber-500" />
                  <span>SIEM & Sync</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-2 py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 shadow-sm transition-all text-xs">
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  <span>Audits</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: BRANDING & WHITE-LABELING */}
              <TabsContent value="appearance" className="space-y-6">
                <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <PaintBucket className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">Marque Blanche & Apparence</CardTitle>
                    </div>
                    <CardDescription>Personnalisez l'identité visuelle de la plateforme SOC pour vos clients.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="tenantName">Nom de l'organisation (Tenant)</Label>
                      <Input 
                        id="tenantName" 
                        value={settings.tenantName} 
                        onChange={(e) => setSettings({...settings, tenantName: e.target.value})}
                        className="max-w-md transition-all focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Logo de l'entreprise</Label>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 text-muted-foreground overflow-hidden">
                          {settings.logoBase64 ? (
                            <img src={settings.logoBase64} alt="Custom Logo" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-xs font-semibold">LOGO</span>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={logoInputRef} 
                          onChange={handleLogoUpload} 
                          accept="image/png, image/jpeg, image/svg+xml" 
                          className="hidden" 
                        />
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 cursor-pointer" 
                            onClick={() => logoInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" /> Uploader
                          </Button>
                          {settings.logoBase64 && (
                            <Button 
                              variant="ghost" 
                              className="text-rose-500 hover:text-rose-600 h-7 text-[10px] px-2 cursor-pointer" 
                              onClick={() => setSettings({...settings, logoBase64: ""})}
                            >
                              Supprimer
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">PNG ou SVG transparent. Format carré recommandé. Max 2 Mo.</p>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Thème par défaut de la plateforme</Label>
                      <div className="flex flex-wrap gap-4">
                        <Button 
                          variant={theme === "light" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTheme("light")}
                          className="gap-2"
                        >
                          <Sun className="h-4 w-4" /> Clair
                        </Button>
                        <Button 
                          variant={theme === "dark" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTheme("dark")}
                          className="gap-2"
                        >
                          <Moon className="h-4 w-4" /> Sombre
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: SECURITY & NETWORK ACCESS */}
              <TabsContent value="security" className="space-y-6">
                <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-xl">Sécurité & Accès Réseau</CardTitle>
                    </div>
                    <CardDescription>
                      Gérez les politiques d'authentification forte, l'inactivité et les restrictions d'accès IP/Géo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-1">
                        <Label className="font-semibold text-base">Forcer le MFA (Multi-Facteur)</Label>
                        <p className="text-xs text-muted-foreground">Obligatoire pour tous les Analystes, Superviseurs et Admins.</p>
                      </div>
                      <Switch 
                        checked={settings.forceMfa} 
                        onCheckedChange={(c) => setSettings({...settings, forceMfa: c})}
                      />
                    </div>
                    
                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-semibold">Expiration Session (Minutes)</Label>
                        <Select value={settings.sessionTimeout} onValueChange={(v) => setSettings({...settings, sessionTimeout: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 Minutes</SelectItem>
                            <SelectItem value="30">30 Minutes</SelectItem>
                            <SelectItem value="60">1 Heure</SelectItem>
                            <SelectItem value="240">4 Heures</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Déconnecte automatiquement l'analyste après inactivité.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Source CTI (Cyber Threat Intel)</Label>
                        <Select value={settings.ctiFeedSource} onValueChange={(v) => setSettings({...settings, ctiFeedSource: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alienvault">AlienVault OTX (Recommandé)</SelectItem>
                            <SelectItem value="virustotal">VirusTotal Enterprise API</SelectItem>
                            <SelectItem value="crowdstrike">CrowdStrike Falcon Intell</SelectItem>
                            <SelectItem value="misp">MISP Local Instance</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Flux d'indicateurs utilisé pour enrichir les alertes SIEM.</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="font-semibold text-base flex items-center gap-1.5">
                            <Globe className="h-4 w-4 text-emerald-500 animate-pulse" />
                            Géo-blocage Actif (Threat Map)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Bloque automatiquement l'accès au portail depuis les pays classés "Haut Risque" sur la Threat Map.
                          </p>
                        </div>
                        <Switch 
                          checked={settings.blockHighRiskCountries} 
                          onCheckedChange={(c) => setSettings({...settings, blockHighRiskCountries: c})}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="font-semibold flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        Liste Blanche d'IPs Habilitées (CIDR)
                      </Label>
                      <Textarea 
                        value={settings.ipWhitelist}
                        onChange={(e) => setSettings({...settings, ipWhitelist: e.target.value})}
                        placeholder="Ex: 10.0.0.0/8, 192.168.1.0/24"
                        rows={3}
                        className="font-mono text-xs focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Séparez les plages d'adresses par des virgules. Laisse vide pour autoriser toutes les adresses IPs.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: DJIB'SON IA COPILOT (SOAR) */}
              <TabsContent value="ai" className="space-y-6">
                <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-xl">Djib'son IA Copilot & SOAR</CardTitle>
                    </div>
                    <CardDescription>
                      Configurez l'intelligence artificielle du SOC pour l'assistance à la remédiation et la rédaction de rapports.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="font-semibold text-base flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                          Mode SOAR Autonome (Isolation Directe)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Autorise Djib'son IA à exécuter automatiquement des playbooks de confinement (ex: isoler un agent, réinitialiser un mot de passe).
                        </p>
                      </div>
                      <Switch 
                        checked={settings.aiAutonomousSoar} 
                        onCheckedChange={(c) => setSettings({...settings, aiAutonomousSoar: c})}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold">Seuil de Confiance Minimum de l'IA</Label>
                        <span className="font-mono text-sm bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-md font-semibold">
                          {settings.aiConfidenceThreshold}%
                        </span>
                      </div>
                      <Slider 
                        value={[settings.aiConfidenceThreshold]} 
                        onValueChange={(v) => setSettings({...settings, aiConfidenceThreshold: v[0]})}
                        min={50}
                        max={99} 
                        step={1} 
                        className="py-4"
                        disabled={!settings.aiAutonomousSoar}
                      />
                      <p className="text-xs text-muted-foreground">
                        Seuil d'auto-évaluation en dessous duquel Djib'son IA demandera obligatoirement une validation humaine dans le centre d'alerte.
                      </p>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-semibold">Moteur LLM Principal</Label>
                        <Select value={settings.aiModelEngine} onValueChange={(v) => setSettings({...settings, aiModelEngine: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="claude-3-5">Claude 3.5 Sonnet (Recommandé)</SelectItem>
                            <SelectItem value="gpt-4o">GPT-4o Security Fine-tuned</SelectItem>
                            <SelectItem value="llama-3-70b">Llama-3 70B (Local Tenant Instance)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Moteur IA utilisé pour l'analyse heuristique des logs et le chatbot d'audit.</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Langue Système Djib'son IA</Label>
                        <Select value={settings.aiSystemLanguage} onValueChange={(v) => setSettings({...settings, aiSystemLanguage: v})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fr">Français (Langue du Site)</SelectItem>
                            <SelectItem value="en">English (US)</SelectItem>
                            <SelectItem value="ar">العربية (Arabe)</SelectItem>
                            <SelectItem value="wo">Wolof (Sénégal)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Langue par défaut utilisée pour la génération automatique de rapports d'incident.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 4: SIEM & SYNCHRONIZATION */}
              <TabsContent value="siem" className="space-y-6">
                <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-amber-500" />
                      <CardTitle className="text-xl">SIEM, Wazuh & IRIS Database Sync</CardTitle>
                    </div>
                    <CardDescription>
                      Ajustez la rétention des données et régulez le flux d'événements pour contrer le bruit et la surcharge.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Logs bruts SIEM (Wazuh)</Label>
                        <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded-md font-semibold">
                          {settings.retentionLogs} Jours
                        </span>
                      </div>
                      <Slider 
                        value={[settings.retentionLogs]} 
                        onValueChange={(v) => setSettings({...settings, retentionLogs: v[0]})}
                        max={365} 
                        step={15} 
                        className="py-4"
                      />
                      <p className="text-xs text-muted-foreground">Archivage automatique à froid dans un bucket de stockage externe après ce délai.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Alertes & Incidents (TheHive/IRIS)</Label>
                        <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded-md font-semibold">
                          {settings.retentionAlerts} Jours
                        </span>
                      </div>
                      <Slider 
                        value={[settings.retentionAlerts]} 
                        onValueChange={(v) => setSettings({...settings, retentionAlerts: v[0]})}
                        max={730} 
                        step={30} 
                        className="py-4"
                      />
                      <p className="text-xs text-muted-foreground">Conservation des métadonnées d'investigations actives sur la base principale.</p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="font-semibold text-base flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                          Protection Anti-Tempête d'Alertes
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Si un agent émet trop d'événements répétitifs, Djib'son IA les consolide en un seul cas parent.
                        </p>
                      </div>
                      <Switch 
                        checked={settings.alertStormProtection} 
                        onCheckedChange={(c) => setSettings({...settings, alertStormProtection: c})}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold">Seuil de Tempête (Alertes/Min)</Label>
                          <span className="font-mono text-xs bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                            {settings.stormThreshold} Evts
                          </span>
                        </div>
                        <Slider 
                          value={[settings.stormThreshold]} 
                          onValueChange={(v) => setSettings({...settings, stormThreshold: v[0]})}
                          min={50}
                          max={500} 
                          step={25} 
                          className="py-2"
                          disabled={!settings.alertStormProtection}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-semibold">Intervalle Sync BDD (Secondes)</Label>
                          <span className="font-mono text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-semibold">
                            {settings.syncInterval} s
                          </span>
                        </div>
                        <Slider 
                          value={[settings.syncInterval]} 
                          onValueChange={(v) => setSettings({...settings, syncInterval: v[0]})}
                          min={5}
                          max={120} 
                          step={5} 
                          className="py-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 5: AUDITS LOGS & WEBHOOKS */}
              <TabsContent value="audit" className="space-y-6">
                <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-xl">Journaux d'Audit & Exports Externes</CardTitle>
                    </div>
                    <CardDescription>
                      Exportez en temps réel l'ensemble des actions réalisées par les administrateurs et analystes vers vos propres SIEM ou Syslogs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="auditWebhookUrl" className="font-semibold flex items-center gap-1.5">
                        <Network className="h-4 w-4 text-blue-500" />
                        URL Webhook d'Export de l'Audit (JSON POST)
                      </Label>
                      <Input 
                        id="auditWebhookUrl" 
                        value={settings.auditWebhookUrl} 
                        onChange={(e) => setSettings({...settings, auditWebhookUrl: e.target.value})}
                        placeholder="https://siem-client.company.com/webhook/audit"
                        className="transition-all focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Toutes les actions d'authentification, de modification de profil et d'activation de SOAR y seront poussées en HTTPS POST.
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="font-semibold">Verbosité de l'audit</Label>
                      <Select value={settings.auditVerbosity} onValueChange={(v) => setSettings({...settings, auditVerbosity: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Basse (Erreurs & Modifications critiques uniquement)</SelectItem>
                          <SelectItem value="medium">Standard (Toutes les actions administratives & SOAR)</SelectItem>
                          <SelectItem value="high">Haute / Debug (Inclut les requêtes de lecture d'alertes & IOCs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Le niveau Standard est recommandé pour la conformité ISO 27001 et PCI-DSS.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Dashboard Summary & Action Pane (Right side) */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Live State Summary Panel */}
            <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-4 border-b border-border/50">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-primary" />
                  Synthèse Active du Tenant
                </h3>
                <p className="text-xs text-muted-foreground">Résumé des politiques appliquées en temps réel.</p>
              </div>
              <CardContent className="p-4 space-y-4 text-xs">
                
                <div className="space-y-2">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Général</span>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Organisation:</span>
                    <span className="font-semibold text-right">{settings.tenantName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Thème actif:</span>
                    <span className="font-semibold capitalize flex items-center gap-1">
                      {theme === "dark" ? <Moon className="h-3 w-3 text-yellow-500" /> : <Sun className="h-3 w-3 text-amber-500" />}
                      {theme}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Sécurité</span>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Double Facteur:</span>
                    <span className={`font-semibold ${settings.forceMfa ? "text-emerald-500" : "text-amber-500"}`}>
                      {settings.forceMfa ? "Forcé (MFA)" : "Désactivé"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Géo-blocage:</span>
                    <span className={`font-semibold ${settings.blockHighRiskCountries ? "text-emerald-500" : "text-amber-500"}`}>
                      {settings.blockHighRiskCountries ? "Actif (Threat Map)" : "Inactif"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Session inactivité:</span>
                    <span className="font-semibold text-right">{settings.sessionTimeout} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Intelligence Artificielle</span>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">SOAR Djib'son IA:</span>
                    <span className={`font-semibold flex items-center gap-1 ${settings.aiAutonomousSoar ? "text-purple-500" : "text-slate-400"}`}>
                      {settings.aiAutonomousSoar ? "Mode Autonome" : "Semi-Autonome"}
                    </span>
                  </div>
                  {settings.aiAutonomousSoar && (
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground">Seuil Confiance:</span>
                      <span className="font-semibold text-purple-500">{settings.aiConfidenceThreshold}%</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Moteur IA:</span>
                    <span className="font-semibold text-right text-purple-400">{settings.aiModelEngine === "claude-3-5" ? "Claude 3.5 Sonnet" : settings.aiModelEngine}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider">Rétention & Sync</span>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Logs Wazuh:</span>
                    <span className="font-semibold text-right">{settings.retentionLogs} jours</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Incidents IRIS:</span>
                    <span className="font-semibold text-right">{settings.retentionAlerts} jours</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/20">
                    <span className="text-muted-foreground">Anti-Tempête:</span>
                    <span className={`font-semibold ${settings.alertStormProtection ? "text-amber-500" : "text-slate-400"}`}>
                      {settings.alertStormProtection ? `Oui (> ${settings.stormThreshold} /min)` : "Non"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Buttons */}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full shadow-lg gap-2 cursor-pointer transition-all hover:scale-[1.01]" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> 
                    Sauvegarde...
                  </span>
                ) : (
                  <>
                    <Save className="h-5 w-5" /> 
                    Appliquer les changements
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full bg-background dark:bg-zinc-900 border-border hover:bg-muted cursor-pointer transition-all"
                onClick={handleRestore}
              >
                Restaurer par défaut
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
