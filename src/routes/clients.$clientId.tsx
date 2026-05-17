import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building, Mail, Phone, Globe, Shield, ArrowLeft, Loader2, Save, Power, PowerOff, KeyRound, Laptop, Download, UploadCloud, Copy, Check, Activity, FileText, Sparkles, Cpu, AlertTriangle, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getClientExtendedData, downloadContractFile, ClientExtendedData } from "./clients.index";

export const Route = createFileRoute("/clients/$clientId")({
  head: () => ({ meta: [{ title: "Console Client 360° — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><ClientProfile /></RequireAuth>,
});

function ClientProfile() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Onglet actif : overview | pcs | contract | alerts
  const [activeTab, setActiveTab] = useState<"overview" | "pcs" | "contract" | "alerts">("overview");
  
  // Données étendues EDR & Contrat (persistance locale via localStorage)
  const [extData, setExtData] = useState<ClientExtendedData | null>(null);
  
  // États de simulation EDR
  const [scansProgress, setScansProgress] = useState<Record<string, number>>({});
  const [scansStatus, setScansStatus] = useState<Record<string, string>>({});
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [edrDeployOs, setEdrDeployOs] = useState<"windows" | "linux" | "macos">("windows");
  
  // États de simulation Contrat
  const [uploadingContract, setUploadingContract] = useState(false);
  const [contractUploadProgress, setContractUploadProgress] = useState(0);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    organization: "",
    website: "",
  });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientId)
        .single();
        
      if (error) throw error;
      
      setProfile(data);
      
      // Récupérer ou générer les données EDR / Contrat depuis notre localStorage
      const extended = getClientExtendedData(clientId, data.organization || "Client");
      setExtData(extended);
      
      setForm({
        fullName: data.full_name || "",
        email: data.email || "",
        phone: localStorage.getItem(`phone_${clientId}`) || "",
        organization: data.organization || "",
        website: localStorage.getItem(`web_${clientId}`) || "",
      });
    } catch (e: any) {
      toast.error("Erreur", { description: "Impossible de charger le profil du client" });
      navigate({ to: "/clients" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [clientId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName,
          organization: form.organization,
        })
        .eq("id", clientId);
        
      if (error) throw error;

      // Sauvegarde des champs complémentaires simulés localement
      localStorage.setItem(`phone_${clientId}`, form.phone);
      localStorage.setItem(`web_${clientId}`, form.website);

      // Si l'organisation a changé, mettre à jour le contrat généré
      if (extData && form.organization !== extData.clientId) {
        const updatedExt = { ...extData };
        localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updatedExt));
      }

      toast.success("Profil mis à jour", { description: "Les modifications ont été enregistrées avec succès." });
      await loadProfile();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!profile) return;
    const action = profile.is_active ? "Désactivation" : "Activation";
    const toastId = toast.loading(`${action} en cours...`);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !profile.is_active })
        .eq("id", clientId);
        
      if (error) throw error;
      toast.success(`Client ${profile.is_active ? "désactivé" : "activé"} avec succès`, { id: toastId });
      await loadProfile();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message, id: toastId });
    }
  };

  // ----------------------------------------------------
  // SIMULATION ACTIONS EDR
  // ----------------------------------------------------
  
  // Action EDR : Isoler / Rétablir la machine
  const toggleIsolatePc = (pcId: string) => {
    if (!extData) return;
    
    const updatedPcs = extData.pcs.map(pc => {
      if (pc.id === pcId) {
        const willIsolate = pc.status !== "isolated";
        if (willIsolate) {
          toast.warning("Machine isolée", {
            description: `Le terminal ${pc.name} a été mis en quarantaine réseau par l'agent EDR.`
          });
          return { ...pc, status: "isolated" as const };
        } else {
          toast.success("Machine reconnectée", {
            description: `L'accès réseau a été entièrement rétabli pour ${pc.name}.`
          });
          return { ...pc, status: "active" as const };
        }
      }
      return pc;
    });

    const newExtData = { ...extData, pcs: updatedPcs };
    // Ajustement dynamique de la santé cyber du client selon les alertes / isolations
    const activeAlerts = updatedPcs.filter(pc => pc.status === "alert").length;
    const isolatedPcs = updatedPcs.filter(pc => pc.status === "isolated").length;
    const baseScore = 95 - (activeAlerts * 15) + (isolatedPcs * 5); // Isoler remonte légèrement le score car mitige le risque
    newExtData.cyberScore = Math.min(99, Math.max(45, baseScore));

    setExtData(newExtData);
    localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(newExtData));
  };

  // Action EDR : Lancer un scan de vulnérabilités
  const triggerScan = (pcId: string, pcName: string) => {
    if (scansProgress[pcId] !== undefined) return; // Déjà en cours

    toast.info("Lancement du scan EDR", {
      description: `Détection active des vulnérabilités sur ${pcName}...`
    });

    setScansProgress(prev => ({ ...prev, [pcId]: 0 }));
    setScansStatus(prev => ({ ...prev, [pcId]: "Scan en cours..." }));

    const interval = setInterval(() => {
      setScansProgress(prev => {
        const next = (prev[pcId] ?? 0) + 10;
        if (next >= 100) {
          clearInterval(interval);
          setScansStatus(st => ({ ...st, [pcId]: "Terminé (0 Vuln. Critiques)" }));
          toast.success("Scan EDR complet", {
            description: `Le scan sur ${pcName} s'est achevé. Aucun malware ou faille critique détectés.`
          });
          // Effacer la jauge après 3s
          setTimeout(() => {
            setScansProgress(p => {
              const copy = { ...p };
              delete copy[pcId];
              return copy;
            });
          }, 3000);
          return { ...prev, [pcId]: 100 };
        }
        return { ...prev, [pcId]: next };
      });
    }, 300);
  };

  // Action EDR : Télécharger rapport de logs forensic (DFIR)
  const downloadDfirLogs = (pcName: string, pcIp: string, os: string) => {
    const logs = `================================================================================
                    RAPPORT FORENSIC INOVA EDR (DFIR LIGHT)
================================================================================
GÉNÉRÉ LE         : ${new Date().toISOString()}
HOSTNAME          : ${pcName}
IP DU TERMINAL    : ${pcIp}
SYSTÈME           : ${os.toUpperCase()}
AGENT ID          : WZ-${Math.floor(1000 + Math.random() * 9000)}
STATUT EDR        : SURVEILLANCE ACTIVE
--------------------------------------------------------------------------------
1. PROCESSUS EN COURS (ÉCHANTILLON)
--------------------------------------------------------------------------------
[PID: 4]     System
[PID: 104]   smss.exe
[PID: 412]   csrss.exe
[PID: 910]   lsass.exe
[PID: 1204]  svchost.exe -k NetworkService
[PID: 3412]  wazuh-agent.exe (Actif, Intégrité OK)
[PID: 4902]  explorer.exe

--------------------------------------------------------------------------------
2. ARCHITECTURE RÉSEAU ACTIVE (CONNEXIONS)
--------------------------------------------------------------------------------
TCP   127.0.0.1:49152        127.0.0.1:0            LISTENING
TCP   ${pcIp}:51421        10.0.0.1:1514 (SOC Server) ESTABLISHED
UDP   0.0.0.0:123            *:*

--------------------------------------------------------------------------------
3. ANALYSE D'INTÉGRITÉ DU SYSTÈME (SYSCHECK)
--------------------------------------------------------------------------------
- Modification de fichiers hosts : Aucune modification suspecte détectée.
- Registre démarrage (RunKeys)  : Analyse complète OK (7 clés approuvées).
- Fichiers système critiques     : Intégrité à 100% (hash sha256 validés).

--------------------------------------------------------------------------------
4. RÉSULTAT DU RENSEIGNEMENT MENACES (THREAT INTEL)
--------------------------------------------------------------------------------
[OK] Analyse en tâche de fond virustotal : 0 détections.
[OK] Correspondance IOC MISP            : 0 déclencheurs.

================================================================================
                 INOVA CYBER SOC — PROTECTION DE FIN DE CHAINE
================================================================================`;

    const blob = new Blob([logs], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DFIR_Logs_${pcName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Rapport DFIR exporté", {
      description: `Les logs forensic de ${pcName} ont été téléchargés avec succès.`
    });
  };

  // ----------------------------------------------------
  // SIMULATION CONTRATS & TÉLÉVERSEMENT
  // ----------------------------------------------------
  const handleDownloadContract = () => {
    if (!extData) return;
    downloadContractFile(form.organization || "Client", form.fullName || "Représentant", extData);
    toast.success("Contrat généré", {
      description: "Le contrat de services a été structuré et téléchargé."
    });
  };

  const simulateContractUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingContract(true);
    setContractUploadProgress(10);

    const interval = setInterval(() => {
      setContractUploadProgress(prev => {
        const next = prev + 30;
        if (next >= 100) {
          clearInterval(interval);
          setUploadingContract(false);
          toast.success("Nouveau contrat importé !", {
            description: `Le document "${file.name}" a été associé à ce client. Le statut est actif.`
          });
          
          if (extData) {
            const updated = {
              ...extData,
              contractStatus: "Actif" as const,
              contractEnd: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0] // Renouvelé pour un an
            };
            setExtData(updated);
            localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updated));
          }
          return 100;
        }
        return next;
      });
    }, 400);
  };

  // Copier le script d'installation dans le presse-papier
  const copyScriptToClipboard = (script: string, os: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(os);
    toast.success("Script copié !", {
      description: `La commande d'installation EDR pour ${os} est dans le presse-papier.`
    });
    setTimeout(() => setCopiedScript(null), 2500);
  };

  const getScripts = () => {
    const serverIp = "10.0.0.1";
    const groupName = form.organization ? form.organization.toLowerCase().replace(/[^a-z0-9]/g, "") : "client-default";
    return {
      windows: `[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri "https://soc.inova.sn/deploy/edr-agent.msi" -OutFile "edr-agent.msi"; Start-Process msiexec.exe -ArgumentList "/i edr-agent.msi WAZUH_MANAGER='${serverIp}' WAZUH_REGISTRATION_SERVER='${serverIp}' WAZUH_AGENT_GROUP='${groupName}' /q" -Wait`,
      linux: `wget https://soc.inova.sn/deploy/edr-agent.deb && WAZUH_MANAGER='${serverIp}' WAZUH_AGENT_GROUP='${groupName}' dpkg -i edr-agent.deb && systemctl daemon-reload && systemctl enable wazuh-agent && systemctl start wazuh-agent`,
      macos: `curl -so edr-agent.pkg https://soc.inova.sn/deploy/edr-agent.pkg && sudo installer -pkg edr-agent.pkg -target / && echo "WAZUH_MANAGER='${serverIp}'\nWAZUH_AGENT_GROUP='${groupName}'" | sudo tee /Library/Ossec/etc/local_internal_options.conf && sudo /Library/Ossec/bin/wazuh-control start`,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile || !extData) return null;

  const connectedPcs = extData.pcs.filter(pc => pc.status !== "disconnected").length;
  const scripts = getScripts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* En-tête Client Premium */}
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap pb-6 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
              <Link to="/clients">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 dark:from-gray-100 dark:via-gray-300 dark:to-gray-400 bg-clip-text text-transparent">
                  {form.organization || form.fullName || profile.email}
                </h1>
                <Badge variant={profile.is_active ? "default" : "secondary"} className="rounded-lg font-medium px-2 py-0.5">
                  {profile.is_active ? "Abonnement Actif" : "Accès Suspendu"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                <Building className="h-4 w-4" /> Représentant : <span className="font-semibold text-foreground">{form.fullName}</span> | Email : <span className="font-semibold text-foreground">{profile.email}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={profile.is_active ? "destructive" : "default"} 
              className="shadow-md rounded-xl hover:translate-y-[-1px] transition-all"
              onClick={toggleActive}
            >
              {profile.is_active ? (
                <><PowerOff className="mr-2 h-4 w-4" /> Suspendre le client</>
              ) : (
                <><Power className="mr-2 h-4 w-4" /> Activer le client</>
              )}
            </Button>
          </div>
        </div>

        {/* Barre d'Onglets Premium */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl mb-8 w-fit">
          <Button 
            variant={activeTab === "overview" ? "default" : "ghost"}
            className={`rounded-xl px-5 py-2 transition-all font-medium ${activeTab === "overview" ? "shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity className="h-4 w-4 mr-2" /> Vue générale
          </Button>
          <Button 
            variant={activeTab === "pcs" ? "default" : "ghost"}
            className={`rounded-xl px-5 py-2 transition-all font-medium ${activeTab === "pcs" ? "shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("pcs")}
          >
            <Laptop className="h-4 w-4 mr-2" /> PC Connectés ({connectedPcs})
          </Button>
          <Button 
            variant={activeTab === "contract" ? "default" : "ghost"}
            className={`rounded-xl px-5 py-2 transition-all font-medium ${activeTab === "contract" ? "shadow-md" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("contract")}
          >
            <FileText className="h-4 w-4 mr-2" /> Contrats & Facturation
          </Button>
        </div>

        {/* Onglet 1 : VUE D'ENSEMBLE */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Colonne de Gauche : Cyber Health & SLAs */}
            <div className="space-y-6 md:col-span-1">
              
              {/* Jauge animée SVG de Score Cyber */}
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden text-center p-6 relative">
                <div className="absolute top-3 right-3">
                  <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none font-bold">EDR ACTIF</Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center justify-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Indice de Santé Cyber
                  </CardTitle>
                  <CardDescription>Évaluation de conformité EDR globale</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col items-center">
                  <div className="relative h-36 w-36 flex items-center justify-center">
                    <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Cercle arrière */}
                      <circle cx="50" cy="50" r="40" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" fill="transparent" />
                      {/* Cercle actif avec animation */}
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        stroke="oklch(0.72 0.20 50)" 
                        strokeWidth="8" 
                        fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * extData.cyberScore) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="text-center">
                      <span className="text-3xl font-extrabold tracking-tight">{extData.cyberScore}%</span>
                      <p className="text-xs text-emerald-500 dark:text-emerald-400 font-bold mt-0.5">EXCELLENT</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 px-2">
                    Le score prend en compte les machines actives, le niveau d'alertes résolues et la conformité aux signatures SOC.
                  </p>
                </CardContent>
              </Card>

              {/* Statuts des SLAs du Contrat */}
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Garanties de Service (SLA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                    <div>
                      <p className="text-sm font-semibold">Temps de Détection (MTTD)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Alerte initiale d'intrusion</p>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-bold border-none">&lt; 15 min</Badge>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                    <div>
                      <p className="text-sm font-semibold">Temps de Réponse (MTTR)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Isolation / Résolution</p>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-bold border-none">&lt; 2 heures</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Disponibilité Connecteurs</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Wazuh, MISP & TheHive</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">99.98% OK</span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Colonne de Droite (2/3) : Formulaire d'information Client */}
            <div className="space-y-6 md:col-span-2">
              <form onSubmit={handleSave}>
                <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-extrabold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Fiche d'identité & Profil
                    </CardTitle>
                    <CardDescription>Gérez les coordonnées officielles de votre client.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="font-semibold text-sm">Nom complet du contact</Label>
                        <Input
                          id="fullName"
                          required
                          value={form.fullName}
                          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                          className="bg-background/40 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-semibold text-sm">Téléphone professionnel</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+221 33 800 00 00"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="bg-background/40 transition-all focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-semibold text-sm">Adresse e-mail (Lecture seule)</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          disabled
                          value={form.email}
                          className="pl-9 bg-muted/40 cursor-not-allowed text-muted-foreground border-border/40"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">L'email du profil est lié à ses identifiants d'authentification.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-border/30">
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="font-semibold text-sm">Nom de l'entreprise</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="organization"
                            required
                            value={form.organization}
                            onChange={(e) => setForm({ ...form, organization: e.target.value })}
                            className="pl-9 bg-background/40 transition-all focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website" className="font-semibold text-sm">Site Internet</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://client-corp.com"
                            value={form.website}
                            onChange={(e) => setForm({ ...form, website: e.target.value })}
                            className="pl-9 bg-background/40 transition-all focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={saving} className="shadow-md rounded-xl hover:translate-y-[-1px] transition-all">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer la fiche
                          </>
                        )}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              </form>
            </div>

          </div>
        )}

        {/* Onglet 2 : PC CONNECTÉS & AGENT DEPLOYER */}
        {activeTab === "pcs" && (
          <div className="space-y-6">
            
            {/* Tableau des PC Connectés */}
            <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-primary" />
                      Console de terminaux EDR connectés
                    </CardTitle>
                    <CardDescription>Pilotez à distance la protection active des postes clients.</CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 font-bold px-3 py-1 text-sm border-none">
                    {connectedPcs} / {extData.pcs.length} PC Surveillés
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100/50 dark:bg-slate-900/50 text-muted-foreground font-semibold border-b border-border/30">
                      <tr>
                        <th className="px-5 py-3.5">Terminal</th>
                        <th className="px-5 py-3.5">Système / OS</th>
                        <th className="px-5 py-3.5">Adresse IP</th>
                        <th className="px-5 py-3.5">Agent EDR</th>
                        <th className="px-5 py-3.5">Activité</th>
                        <th className="px-5 py-3.5">Ressources</th>
                        <th className="px-5 py-3.5 text-right">Actions de Sécurité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {extData.pcs.map((pc) => {
                        const isScanning = scansProgress[pc.id] !== undefined;
                        const scanVal = scansProgress[pc.id] ?? 0;
                        const scanMsg = scansStatus[pc.id] ?? "";
                        
                        return (
                          <tr key={pc.id} className={`hover:bg-muted/30 transition-all ${pc.status === "isolated" ? "bg-red-500/5" : ""}`}>
                            
                            {/* Terminal Name */}
                            <td className="px-5 py-4 font-semibold text-foreground flex flex-col">
                              <span className="flex items-center gap-1.5">
                                {pc.name}
                                {pc.status === "isolated" && (
                                  <Badge className="bg-rose-500 text-white font-extrabold border-none text-[10px] rounded-md px-1.5 py-0.5 gap-0.5 animate-pulse">
                                    <ShieldAlert className="h-3 w-3" /> ISOLÉ
                                  </Badge>
                                )}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {pc.id.slice(-8)}</span>
                            </td>

                            {/* OS Type */}
                            <td className="px-5 py-4 capitalize font-medium">
                              <span className="flex items-center gap-1.5">
                                {pc.os === "windows" ? "🖥️ Windows" : pc.os === "linux" ? "🐧 Linux" : "🍎 macOS"}
                              </span>
                            </td>

                            {/* IP */}
                            <td className="px-5 py-4 font-mono text-xs">{pc.ip}</td>

                            {/* EDR Agent ID */}
                            <td className="px-5 py-4 font-mono text-xs text-primary font-bold">WZ-{pc.wazuhId}</td>

                            {/* Connection Status */}
                            <td className="px-5 py-4">
                              {pc.status === "active" ? (
                                <Badge className="bg-green-500/10 text-green-500 font-bold border-none rounded-lg px-2">En Ligne</Badge>
                              ) : pc.status === "alert" ? (
                                <Badge className="bg-amber-500/10 text-amber-500 font-bold border-none rounded-lg px-2 animate-bounce">Alerte SOC</Badge>
                              ) : pc.status === "isolated" ? (
                                <Badge className="bg-red-500/10 text-red-500 font-bold border-none rounded-lg px-2">Quarantaine</Badge>
                              ) : (
                                <Badge className="bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-medium border-none rounded-lg px-2">Déconnecté</Badge>
                              )}
                            </td>

                            {/* RAM/CPU load */}
                            <td className="px-5 py-4">
                              {pc.status !== "disconnected" ? (
                                <div className="space-y-1.5 w-24">
                                  <div className="flex items-center justify-between text-[10px] font-mono">
                                    <span>CPU: {pc.cpu}%</span>
                                    <span>RAM: {pc.ram}%</span>
                                  </div>
                                  <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${Math.max(pc.cpu, pc.ram)}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>

                            {/* Security Actions */}
                            <td className="px-5 py-4 text-right">
                              {pc.status === "disconnected" ? (
                                <span className="text-muted-foreground text-xs">Aucune action (Hors Ligne)</span>
                              ) : (
                                <div className="flex flex-col gap-1.5 items-end justify-end">
                                  {isScanning ? (
                                    <div className="w-40 space-y-1 text-left">
                                      <div className="flex justify-between text-[10px] font-semibold">
                                        <span>{scanMsg}</span>
                                        <span>{scanVal}%</span>
                                      </div>
                                      <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 animate-pulse transition-all duration-300" style={{ width: `${scanVal}%` }} />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      {/* Bouton EDR : Lancer un scan */}
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 rounded-lg text-xs bg-slate-50 dark:bg-zinc-900 border-slate-200 hover:bg-slate-100"
                                        onClick={() => triggerScan(pc.id, pc.name)}
                                      >
                                        Lancer scan
                                      </Button>

                                      {/* Bouton EDR : Collecte logs */}
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-lg bg-slate-50 dark:bg-zinc-900 border-slate-200"
                                        onClick={() => downloadDfirLogs(pc.name, pc.ip, pc.os)}
                                        title="Récupérer rapports logs DFIR"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </Button>

                                      {/* Bouton EDR : Isolation EDR */}
                                      <Button 
                                        variant={pc.status === "isolated" ? "default" : "destructive"} 
                                        size="sm"
                                        className="h-8 rounded-lg text-xs shadow-sm font-semibold"
                                        onClick={() => toggleIsolatePc(pc.id)}
                                      >
                                        {pc.status === "isolated" ? "Reconnecter" : "Isoler PC"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* EDR Installation Helper */}
            <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Guide de déploiement de l'agent EDR
                </CardTitle>
                <CardDescription>
                  Générez et copiez la commande d'installation silencieuse pour connecter de nouveaux PC.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* OS Switcher */}
                <div className="flex gap-2 border-b border-border/20 pb-3">
                  <Button
                    variant={edrDeployOs === "windows" ? "default" : "outline"}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setEdrDeployOs("windows")}
                  >
                    🖥️ Windows (PowerShell)
                  </Button>
                  <Button
                    variant={edrDeployOs === "linux" ? "default" : "outline"}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setEdrDeployOs("linux")}
                  >
                    🐧 Linux (Debian/Ubuntu)
                  </Button>
                  <Button
                    variant={edrDeployOs === "macos" ? "default" : "outline"}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setEdrDeployOs("macos")}
                  >
                    🍎 macOS (pkg)
                  </Button>
                </div>

                {/* Console Code Box */}
                <div className="relative">
                  <pre className="p-4 bg-slate-950 dark:bg-black rounded-xl text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-border/40 select-all max-h-40">
                    {edrDeployOs === "windows" ? scripts.windows : edrDeployOs === "linux" ? scripts.linux : scripts.macos}
                  </pre>
                  
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white text-xs border border-slate-700"
                      onClick={() => copyScriptToClipboard(edrDeployOs === "windows" ? scripts.windows : edrDeployOs === "linux" ? scripts.linux : scripts.macos, edrDeployOs)}
                    >
                      {copiedScript === edrDeployOs ? (
                        <><Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Copié</>
                      ) : (
                        <><Copy className="h-3.5 w-3.5 mr-1.5" /> Copier la commande</>
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" /> Note : Cette commande intègre automatiquement les variables de pré-authentification et d'affectation au groupe <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-primary">{form.organization.toLowerCase().replace(/[^a-z0-9]/g, "")}</span>.
                </p>

              </CardContent>
            </Card>

          </div>
        )}

        {/* Onglet 3 : CONTRATS & FACTURATION */}
        {activeTab === "contract" && (
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Colonne de Gauche : Métriques du contrat */}
            <div className="space-y-6 md:col-span-1">
              
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Détails du contrat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Formule d'offre active</span>
                    <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none font-bold text-sm px-2.5 py-0.5 mt-1 rounded-lg">
                      OFFRE {extData.contractTier.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Valeur de l'abonnement</span>
                    <span className="text-2xl font-extrabold text-foreground">{extData.contractValue.toLocaleString("fr-FR")} EUR <span className="text-xs font-normal text-muted-foreground">/ an</span></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">Effet</span>
                      <span className="text-sm font-medium block mt-0.5">{extData.contractStart}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold">Échéance</span>
                      <span className="text-sm font-medium block mt-0.5">{extData.contractEnd}</span>
                    </div>
                  </div>
                  <div className="border-t border-border/30 pt-3">
                    <span className="text-xs text-muted-foreground font-medium block">Statut juridique</span>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold rounded-lg mt-1 px-2.5">
                      ✓ CONTRAT SIGNÉ & EN RÈGLE
                    </Badge>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      className="w-full shadow-md rounded-xl hover:translate-y-[-1px] transition-all gap-2"
                      onClick={handleDownloadContract}
                    >
                      <Download className="h-4.5 w-4.5" /> Télécharger le Contrat (txt)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Téléverser un nouveau contrat signé */}
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-md font-bold flex items-center gap-2">
                    <UploadCloud className="h-4.5 w-4.5 text-primary" /> Mettre à jour le document
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border/70 hover:border-primary/50 transition-all rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={simulateContractUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingContract}
                    />
                    
                    {uploadingContract ? (
                      <div className="space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-xs font-semibold text-foreground">Importation en cours... {contractUploadProgress}%</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                        <p className="text-xs font-semibold text-foreground">Déposez le contrat signé ici</p>
                        <p className="text-[10px] text-muted-foreground">PDF, DOCX ou TXT (Max 10 Mo)</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Le téléversement d'un nouveau contrat renouvelle automatiquement l'échéance et met à jour l'historique d'audit.
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* Colonne de Droite (2/3) : Simulateur visuel de Contrat */}
            <div className="md:col-span-2">
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-border/30">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Aperçu de conformité numérique du contrat
                      </CardTitle>
                      <CardDescription>Document actif signé de manière électronique par les deux entités.</CardDescription>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">CONT-{clientId.slice(0, 8).toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1">
                  
                  {/* Digital replica box */}
                  <div className="border border-border/40 bg-white/70 dark:bg-zinc-950/80 rounded-xl p-6 font-mono text-xs text-foreground/80 leading-relaxed overflow-y-auto max-h-[380px] scrollbar-thin shadow-inner relative">
                    
                    {/* Watermark of signature */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none rotate-12">
                      <div className="border-4 border-emerald-500 rounded-xl p-4 text-center">
                        <span className="text-5xl font-black block">SIGNÉ ÉLECTRONIQUEMENT</span>
                        <span className="text-3xl font-bold mt-1 block">INOVA CYBER SOC</span>
                      </div>
                    </div>

                    <div className="text-center font-bold border-b border-dashed border-border/60 pb-4 mb-4">
                      CONTRAT DE PRESTATION : SÉCURITÉ DE TERMINAUX & SOC DE DERNIÈRE GÉNÉRATION<br/>
                      INOVA PLATFORM SAAS • FORMULE : OFFER {extData.contractTier.toUpperCase()}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="font-bold block text-primary underline">1. ORGANISATION ET COORDONNÉES CLIENT :</span>
                        • Raison sociale : {form.organization || "Non renseignée"}<br/>
                        • Représentant habilité : {form.fullName || "Non renseigné"}<br/>
                        • Statut de l'agent EDR : Actif ({connectedPcs} machines connectées)<br/>
                        • Seuil de sécurité minimum : {extData.cyberScore}% requis.
                      </div>

                      <div>
                        <span className="font-bold block text-primary underline">2. NIVEAUX DE SERVICE ET FACTURATION (SLA) :</span>
                        • Montant récurrent : {extData.contractValue.toLocaleString("fr-FR")} EUR par an.<br/>
                        • Niveau de support : 24/7/365 avec astreinte technique de niveau 3.<br/>
                        • Temps de détection des cyber-menaces : Inférieur à 15 minutes.<br/>
                        • Temps de réponse par blocage et isolation EDR : Inférieur à 2 heures.
                      </div>

                      <div>
                        <span className="font-bold block text-primary underline">3. INVENTAIRE TECHNIQUE DES TERMINAUX COUVERTS :</span>
                        {extData.pcs.map((pc, idx) => (
                          <div key={pc.id} className="pl-4">
                            • [{idx + 1}] {pc.name} ({pc.os.toUpperCase()} • IP: {pc.ip} • ID Agent: WZ-{pc.wazuhId})
                          </div>
                        ))}
                      </div>

                      <div>
                        <span className="font-bold block text-primary underline">4. CLAUSE D'ISOLATION ACTIVE EN CAS D'INTRUSION :</span>
                        Le Client autorise formellement et explicitement le SOC INOVA à exécuter une commande de mise en quarantaine réseau immédiate (Isolation EDR) sur toute machine répertoriée ci-dessus présentant un comportement d'infection avéré (ex: Chiffrement ransomware en cours, bruteforce interne SSH, connexions C2).
                      </div>

                      <div className="border-t border-dashed border-border/60 pt-4 flex justify-between gap-6 flex-wrap font-bold text-[10px]">
                        <div>
                          SIGNATAIRE PRESTATAIRE :<br/>
                          INOVA SECURITY SERVICES<br/>
                          <span className="text-emerald-500">[SIGNÉ ÉLECTRONIQUEMENT ✓]</span><br/>
                          Date d'effet : {extData.contractStart}
                        </div>
                        <div>
                          SIGNATAIRE CLIENT :<br/>
                          {form.organization || "Client"}<br/>
                          <span className="text-emerald-500">[SIGNÉ ÉLECTRONIQUEMENT ✓]</span><br/>
                          Date d'effet : {extData.contractStart}
                        </div>
                      </div>

                    </div>

                  </div>

                </CardContent>
              </Card>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
