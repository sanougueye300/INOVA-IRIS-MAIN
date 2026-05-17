import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { useSocPreferences } from "@/lib/soc-preferences";
import { Sliders, ShieldCheck, PaintBucket, HardDrive, Save, Upload, Moon, Sun, Monitor, Paintbrush } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres Globaux — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminSettings /></RequireAuth>,
});

function AdminSettings() {
  const { theme, setTheme } = useSocPreferences();
  const [saving, setSaving] = useState(false);
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
    };
  });

  const handleSave = () => {
    setSaving(true);
    // Simulate API call and save to localStorage
    setTimeout(() => {
      localStorage.setItem("soc-admin-settings", JSON.stringify(settings));
      setSaving(false);
      toast.success("Paramètres mis à jour", {
        description: "Les nouveaux paramètres globaux ont été appliqués avec succès au tenant.",
      });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        
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
            Configurez l'environnement, l'image de marque et les politiques de sécurité du tenant.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          
          <div className="md:col-span-8 space-y-6">
            {/* Branding & White-labeling */}
            <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <PaintBucket className="h-5 w-5 text-primary" />
                  Marque Blanche & Apparence
                </CardTitle>
                <CardDescription>Personnalisez l'identité visuelle de la plateforme SOC.</CardDescription>
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
                    <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/50 text-muted-foreground">
                      <span className="text-xs font-semibold">LOGO</span>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Upload className="h-4 w-4" /> Uploader
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG ou SVG transparent. Format carré recommandé.</p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Thème par défaut</Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                        className="gap-2"
                      >
                        <Sun className="h-4 w-4" /> Clair
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
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
                </div>
              </CardContent>
            </Card>

            {/* Retention Policies */}
            <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Politiques de Rétention
                </CardTitle>
                <CardDescription>Gérez la durée de conservation des données à chaud sur la plateforme.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">Logs bruts SIEM (Wazuh)</Label>
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
                  <p className="text-xs text-muted-foreground">Durée après laquelle les logs bruts sont déplacés vers le stockage à froid (S3/Glacier).</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">Alertes & Incidents (TheHive/IRIS)</Label>
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
                  <p className="text-xs text-muted-foreground">Conservation des dossiers d'investigation actifs avant archivage en lecture seule.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-4 space-y-6">
            {/* Security */}
            <Card className="shadow-lg border-border/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Sécurité Accès
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-1">
                    <Label className="font-semibold">Forcer le MFA</Label>
                    <p className="text-xs text-muted-foreground">Obligatoire pour tous les Analystes & Admins.</p>
                  </div>
                  <Switch 
                    checked={settings.forceMfa} 
                    onCheckedChange={(c) => setSettings({...settings, forceMfa: c})}
                  />
                </div>
                
                <Separator />

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
                  <p className="text-xs text-muted-foreground">Déconnecte l'utilisateur après une période d'inactivité.</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full shadow-lg gap-2" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> Sauvegarde...</span>
                ) : (
                  <><Save className="h-5 w-5" /> Appliquer les changements</>
                )}
              </Button>
              <Button variant="outline" size="lg" className="w-full bg-background dark:bg-zinc-900 border-border">
                Restaurer par défaut
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
