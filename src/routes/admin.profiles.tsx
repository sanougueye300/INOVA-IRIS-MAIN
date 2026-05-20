import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Save, Key, LayoutDashboard, Bell, Users, ServerCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profiles")({
  head: () => ({ meta: [{ title: "Gestion des profils — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><AdminProfiles /></RequireAuth>,
});

const DEFAULT_PROFILES = [
  { id: "admin", name: "Administrateur", description: "Accès complet au système" },
  { id: "manager", name: "Manager SOC", description: "Supervision globale et facturation" },
  { id: "analyste", name: "Analyste", description: "Traitement des alertes et incidents" },
  { id: "client", name: "Client", description: "Accès en lecture seule à son propre espace" },
];

const PERMISSIONS = [
  {
    category: "Tableau de bord",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard.view", label: "Voir le tableau de bord" },
      { id: "dashboard.metrics", label: "Accéder aux métriques globales" },
    ]
  },
  {
    category: "SOC & Alertes",
    icon: Bell,
    items: [
      { id: "alerts.view", label: "Voir les alertes" },
      { id: "alerts.resolve", label: "Résoudre les alertes" },
      { id: "edr.isolate", label: "Isoler une machine (EDR)" },
    ]
  },
  {
    category: "Gestion Clients",
    icon: Users,
    items: [
      { id: "clients.view", label: "Voir la liste des clients" },
      { id: "clients.edit", label: "Modifier un client" },
      { id: "billing.view", label: "Accéder à la facturation" },
    ]
  },
  {
    category: "Administration",
    icon: ServerCog,
    items: [
      { id: "agents.manage", label: "Gérer les agents" },
      { id: "profiles.manage", label: "Gérer les profils et droits" },
      { id: "settings.manage", label: "Modifier les paramètres globaux" },
    ]
  }
];

function AdminProfiles() {
  const [selectedProfile, setSelectedProfile] = useState(DEFAULT_PROFILES[2].id); // Analyste par défaut
  
  // Simulation de permissions stockées localement
  const [permissionsMap, setPermissionsMap] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem("soc_profiles_permissions");
    if (saved) return JSON.parse(saved);
    
    // Valeurs par défaut simulées
    return {
      "admin": { "dashboard.view": true, "dashboard.metrics": true, "alerts.view": true, "alerts.resolve": true, "edr.isolate": true, "clients.view": true, "clients.edit": true, "billing.view": true, "agents.manage": true, "profiles.manage": true, "settings.manage": true },
      "manager": { "dashboard.view": true, "dashboard.metrics": true, "alerts.view": true, "alerts.resolve": false, "edr.isolate": false, "clients.view": true, "clients.edit": false, "billing.view": true, "agents.manage": false, "profiles.manage": false, "settings.manage": false },
      "analyste": { "dashboard.view": true, "dashboard.metrics": false, "alerts.view": true, "alerts.resolve": true, "edr.isolate": true, "clients.view": true, "clients.edit": false, "billing.view": false, "agents.manage": false, "profiles.manage": false, "settings.manage": false },
      "client": { "dashboard.view": true, "dashboard.metrics": false, "alerts.view": true, "alerts.resolve": false, "edr.isolate": false, "clients.view": false, "clients.edit": false, "billing.view": false, "agents.manage": false, "profiles.manage": false, "settings.manage": false },
    };
  });

  const [saving, setSaving] = useState(false);

  const togglePermission = (permId: string) => {
    setPermissionsMap(prev => ({
      ...prev,
      [selectedProfile]: {
        ...prev[selectedProfile],
        [permId]: !prev[selectedProfile]?.[permId]
      }
    }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem("soc_profiles_permissions", JSON.stringify(permissionsMap));
      toast.success("Droits sauvegardés", {
        description: `Les permissions pour le profil ont été mises à jour avec succès.`
      });
      setSaving(false);
    }, 600);
  };

  const activeProfile = DEFAULT_PROFILES.find(p => p.id === selectedProfile);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  Gestion des Profils
                </h1>
              </div>
              <p className="text-muted-foreground">
                Définissez les droits et les accès pour chaque type de profil
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="shadow-lg hover:shadow-xl transition-shadow">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sélection du Profil */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              Sélection du profil
            </h2>
            <div className="flex flex-col gap-2">
              {DEFAULT_PROFILES.map(p => (
                <Card 
                  key={p.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedProfile === p.id 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedProfile(p.id)}
                >
                  <h3 className={`font-medium ${selectedProfile === p.id ? "text-primary" : ""}`}>
                    {p.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Grille des Permissions */}
          <div className="md:col-span-3">
            <Card className="p-6">
              <div className="mb-6 pb-4 border-b">
                <h2 className="text-xl font-semibold">Droits pour: <span className="text-primary">{activeProfile?.name}</span></h2>
                <p className="text-sm text-muted-foreground mt-1">Cochez les actions que ce profil est autorisé à effectuer.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {PERMISSIONS.map(category => (
                  <div key={category.category} className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wider">
                      <category.icon className="h-4 w-4" />
                      {category.category}
                    </h3>
                    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border">
                      {category.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-4">
                          <label htmlFor={`${selectedProfile}-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1">
                            {item.label}
                          </label>
                          <Switch
                            id={`${selectedProfile}-${item.id}`}
                            checked={permissionsMap[selectedProfile]?.[item.id] || false}
                            onCheckedChange={() => togglePermission(item.id)}
                            disabled={selectedProfile === "admin"} // L'admin a toujours tous les droits
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
