import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MoreVertical, CheckCircle, XCircle, Users, Building2, ExternalLink, CreditCard, Download, ShieldAlert, Laptop, Sparkles, FileText, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/clients/")({
  head: () => ({ meta: [{ title: "Liste des Clients — SOC Platform" }] }),
  component: () => <RequireAuth requireAdmin><ClientsList /></RequireAuth>,
});

export interface ClientExtendedData {
  clientId: string;
  cyberScore: number;
  contractTier: "Bronze" | "Argent" | "Or" | "Platine";
  contractValue: number;
  contractStart: string;
  contractEnd: string;
  contractStatus: "Actif" | "Expiré" | "En attente";
  pcs: Array<{
    id: string;
    name: string;
    os: "windows" | "linux" | "macos";
    ip: string;
    status: "active" | "disconnected" | "alert" | "isolated";
    cpu: number;
    ram: number;
    lastSeen: string;
    wazuhId: string;
  }>;
}

export function getClientExtendedData(clientId: string, orgName: string): ClientExtendedData {
  const localKey = `client_ext_${clientId}`;
  const stored = localStorage.getItem(localKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }

  // Seeding déterministe basé sur l'ID client pour un rendu hyper réaliste et cohérent
  let hash = 0;
  const seedString = clientId + (orgName || "Client");
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
  }

  const tiers: Array<"Bronze" | "Argent" | "Or" | "Platine"> = ["Bronze", "Argent", "Or", "Platine"];
  const contractTier = tiers[hash % tiers.length];
  
  const values = { Bronze: 12000, Argent: 24000, Or: 60000, Platine: 150000 };
  const contractValue = values[contractTier];
  
  const cyberScore = 70 + (hash % 26); // Score entre 70% et 96%

  // Génération réaliste des machines pour la démo
  const pcCount = 2 + (hash % 5); // Entre 2 et 6 PC connectés
  const osList: Array<"windows" | "linux" | "macos"> = ["windows", "linux", "macos"];
  const pcs = Array.from({ length: pcCount }).map((_, idx) => {
    const pcHash = (hash + idx * 17) >>> 0;
    const os = osList[pcHash % osList.length];
    const namePrefix = os === "windows" ? "desktop" : os === "linux" ? "srv-prod" : "macbook";
    const name = `${namePrefix}-${orgName ? orgName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "client"}-${String(idx + 1).padStart(2, "0")}`;
    const ip = `192.168.${1 + (pcHash % 50)}.${10 + (pcHash % 200)}`;
    const statuses: Array<"active" | "disconnected" | "alert"> = ["active", "active", "disconnected", "alert"];
    const status = idx === 0 ? "active" : statuses[pcHash % statuses.length];
    
    return {
      id: `${clientId}-pc-${idx}`,
      name,
      os,
      ip,
      status: status as "active" | "disconnected" | "alert" | "isolated",
      cpu: status === "active" ? 5 + (pcHash % 40) : 0,
      ram: status === "active" ? 20 + (pcHash % 60) : 0,
      lastSeen: status === "active" ? "À l'instant" : `${1 + (pcHash % 24)}h plus tôt`,
      wazuhId: String(200 + idx).padStart(3, "0"),
    };
  });

  const data: ClientExtendedData = {
    clientId,
    cyberScore,
    contractTier,
    contractValue,
    contractStart: new Date(Date.now() - 120 * 86400000).toISOString().split("T")[0],
    contractEnd: new Date(Date.now() + 245 * 86400000).toISOString().split("T")[0],
    contractStatus: "Actif",
    pcs,
  };

  localStorage.setItem(localKey, JSON.stringify(data));
  return data;
}

export function downloadContractFile(orgName: string, fullName: string, extData: ClientExtendedData) {
  const content = `================================================================================
                     CONTRAT DE SERVICES DE CYBERSÉCURITÉ SOC / EDR
================================================================================

RÉFÉRENCE CONTRAT : CONT-${extData.clientId.slice(0, 8).toUpperCase()}-${new Date(extData.contractStart).getFullYear()}
DATE D'EFFET      : ${extData.contractStart}
DATE D'ÉCHÉANCE   : ${extData.contractEnd}
STATUT DU CONTRAT : ${extData.contractStatus.toUpperCase()}

--------------------------------------------------------------------------------
1. PARTIES CONTRACTANTES
--------------------------------------------------------------------------------
PRESTATAIRE : INOVA CYBER SOC PLATFORM
              Représenté par l'équipe SOC d'Administration

CLIENT      : ${orgName || "Non spécifié"}
              Représenté par : ${fullName || "Non spécifié"}

--------------------------------------------------------------------------------
2. NIVEAU DE SERVICE & ABONNEMENT (SLA)
--------------------------------------------------------------------------------
FORMULE SOUSCRITE   : OFFRE ${extData.contractTier.toUpperCase()}
VALEUR DU CONTRAT   : ${extData.contractValue.toLocaleString("fr-FR")} EUR / AN
NOMBRE MAX DE PC    : ${extData.pcs.length} Postes connectés autorisés

NIVEAUX DE SERVICE (SLA) GARANTIS :
- MTTD (Temps moyen de détection)  : < 15 minutes
- MTTR (Temps moyen de réponse)    : < 2 heures
- Support technique                : 24h/24, 7j/7
- Plateforme EDR active            : Oui, avec isolation à distance autorisée

--------------------------------------------------------------------------------
3. INVENTAIRE TECHNIQUE DES POSTES SÉCURISÉS (ACTIFS)
--------------------------------------------------------------------------------
Voici la liste des machines connectées et couvertes par la technologie EDR :

${extData.pcs.map((pc, idx) => `${String(idx + 1).padStart(2, " ")}. MACHINE : ${pc.name.padEnd(30)} OS : ${pc.os.toUpperCase().padEnd(10)} IP : ${pc.ip.padEnd(15)} ID AGENT : ${pc.wazuhId}`).join("\n")}

--------------------------------------------------------------------------------
4. CLAUSE DE CONFIDENTIALITÉ & RESPONSABILITÉ
--------------------------------------------------------------------------------
Les deux parties s'engagent à maintenir une stricte confidentialité concernant
les informations de sécurité, logs, et vulnérabilités détectées sur le réseau.
Le client autorise expressément l'équipe SOC à isoler en quarantaine tout
terminal présentant un comportement hautement suspect ou compromis afin de
prévenir la propagation d'incidents (Ransomware, Bruteforce interne).

--------------------------------------------------------------------------------
5. SIGNATURES ÉLECTRONIQUES VALIDES
--------------------------------------------------------------------------------
Signé numériquement par :
- Pour le Prestataire : Administration INOVA SOC
- Pour le Client      : ${fullName || "Non spécifié"} (Signature certifiée le ${extData.contractStart})

================================================================================
              INOVA CYBER SOC — TOUS DROITS RÉSERVÉS — CONTRAT SÉCURISÉ
================================================================================`;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Contrat_${(orgName || "Client").replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface Profile { id: string; email: string | null; full_name: string | null; organization: string | null; is_active: boolean; created_at: string }
export const DEMO_CLIENTS: Profile[] = [
  { id: "demo-client-1", email: "contact@acme-corp.com", full_name: "Jean Dupont", organization: "Acme Corporation", is_active: true, created_at: new Date().toISOString() },
  { id: "demo-client-2", email: "security@techflow.io", full_name: "Alice Martin", organization: "TechFlow Solutions", is_active: true, created_at: new Date().toISOString() },
  { id: "demo-client-3", email: "it-admin@globex.net", full_name: "Robert Fox", organization: "Globex Network", is_active: false, created_at: new Date().toISOString() },
];

interface RoleRow { user_id: string; role: AppRole }

function ClientsList() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      
      const roles = (r as RoleRow[]) ?? [];
      const clientUserIds = new Set(roles.filter(x => x.role === "client").map(x => x.user_id));
      
      const allProfiles = (p as Profile[]) ?? [];
      const clientProfiles = allProfiles.filter(profile => clientUserIds.has(profile.id));
      
      const existingEmails = new Set(clientProfiles.map(c => c.email));
      const newDemos = DEMO_CLIENTS.filter(d => !existingEmails.has(d.email));
      
      setProfiles([...newDemos, ...clientProfiles]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    console.log('📋 Chargement initial de la liste des clients...');
    load(); 

    // S'abonner aux changements en temps réel sur la table profiles
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('🔔 Changement détecté dans la table profiles:', payload);
          // Recharger la liste quand il y a un changement
          load();
        }
      )
      .subscribe();

    // Nettoyer l'abonnement au démontage du composant
    return () => {
      console.log('🔌 Désabonnement des changements en temps réel');
      supabase.removeChannel(channel);
    };
  }, []);

  // Recharger la liste quand le paramètre refresh change (après création d'un nouveau client)
  useEffect(() => {
    if (searchParams.refresh) {
      console.log('🔄 Rechargement de la liste après création d\'un nouveau client...');
      setTimeout(() => {
        load();
      }, 500); // Petit délai pour laisser le temps à Supabase de propager les données
    }
  }, [searchParams.refresh]);

  useEffect(() => {
    let filtered = profiles;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.organization?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(p =>
        statusFilter === "active" ? p.is_active : !p.is_active
      );
    }
    setFilteredProfiles(filtered);
  }, [profiles, searchTerm, statusFilter]);

  const toggleActive = async (p: Profile) => {
    const toastId = toast.loading(`${p.is_active ? "Désactivation" : "Activation"} en cours...`);
    try {
      const isDemo = DEMO_CLIENTS.some(d => d.id === p.id);
      if (!isDemo) {
        const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
        if (error) throw error;
      }
      toast.success(`Client ${p.is_active ? "désactivé" : "activé"} avec succès`, { id: toastId });
      await load();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message, id: toastId });
    }
  };

  const handleDownloadQuickContract = (p: Profile) => {
    const ext = getClientExtendedData(p.id, p.organization || "Client");
    downloadContractFile(p.organization || "Client", p.full_name || "Représentant", ext);
    toast.success("Téléchargement lancé", {
      description: `Le contrat de ${p.organization || p.full_name} a été généré et téléchargé.`
    });
  };

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active).length,
    inactive: profiles.filter(p => !p.is_active).length,
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Obtenir des couleurs selon le score cyber
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50";
    if (score >= 80) return "text-orange-500 bg-orange-50 dark:bg-orange-950/30 border-orange-200/50";
    return "text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200/50";
  };

  const getContractBadge = (tier: string) => {
    switch (tier) {
      case "Platine":
        return "bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none font-bold";
      case "Or":
        return "bg-gradient-to-r from-amber-400 to-orange-500 text-white border-none font-bold";
      case "Argent":
        return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100 border-none";
      default:
        return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-none";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                Espace Clients
              </h1>
            </div>
            <p className="text-muted-foreground">
              Supervisez le niveau de sécurité EDR, les machines connectées et téléchargez les contrats d'un clic.
            </p>
          </div>
          
          <Button asChild className="shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all">
            <Link to="/clients/new">
              <Sparkles className="h-4 w-4 mr-2" /> Nouveau client
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="p-5 hover:shadow-lg transition-all border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total clients souscrits</p>
                <p className="text-3xl font-extrabold mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </Card>
          <Card className="p-5 hover:shadow-lg transition-all border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SOC Protégés Actifs</p>
                <p className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </Card>
          <Card className="p-5 hover:shadow-lg transition-all border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente de connexion</p>
                <p className="text-3xl font-extrabold text-amber-500 mt-1">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-6 p-4 border-border/50 bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 transition-all focus:ring-2 focus:ring-primary/20 bg-background/50"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>Tous</Button>
              <Button variant={statusFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("active")} className="gap-2">
                <CheckCircle className="h-3 w-3" /> Actifs
              </Button>
              <Button variant={statusFilter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("inactive")} className="gap-2">
                <XCircle className="h-3 w-3" /> Inactifs
              </Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-border/50 bg-card/70 backdrop-blur-md shadow-xl rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/40">
                  <TableHead className="w-[70px]"></TableHead>
                  <TableHead className="font-semibold">Client / Représentant</TableHead>
                  <TableHead className="font-semibold">Organisation</TableHead>
                  <TableHead className="font-semibold">Santé Cyber</TableHead>
                  <TableHead className="font-semibold">PC Connectés</TableHead>
                  <TableHead className="font-semibold">Contrat Actif</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-border/20">
                      <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-muted rounded-full">
                          <Users className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground font-medium text-lg">Aucun client trouvé</p>
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                          Réinitialiser les filtres
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfiles.map(p => {
                    const extData = getClientExtendedData(p.id, p.organization || "Client");
                    const connectedPcs = extData.pcs.filter(pc => pc.status === "active" || pc.status === "alert" || pc.status === "isolated").length;
                    
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors border-b border-border/20">
                        <TableCell>
                          <Link to="/clients/$clientId" params={{ clientId: p.id }}>
                            <Avatar className="h-10 w-10 border border-primary/10 cursor-pointer">
                              <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                {getInitials(p.organization || p.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        </TableCell>
                        <TableCell className="py-4">
                          <Link to="/clients/$clientId" params={{ clientId: p.id }} className="hover:underline cursor-pointer group block">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{p.full_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{p.email}</div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link to="/clients/$clientId" params={{ clientId: p.id }} className="hover:underline cursor-pointer group block">
                            <div className="font-medium flex items-center gap-1.5 group-hover:text-primary transition-colors">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                              {p.organization ?? <span className="text-muted-foreground text-sm font-normal">—</span>}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`px-2.5 py-1 rounded-lg border font-bold flex items-center w-fit gap-1 ${getScoreColor(extData.cyberScore)}`}>
                            <Sparkles className="h-3 w-3" />
                            {extData.cyberScore}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                              <Laptop className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="font-bold text-sm text-foreground">{connectedPcs}</span>
                              <span className="text-muted-foreground text-xs"> / {extData.pcs.length} PC</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`px-2.5 py-1 rounded-lg ${getContractBadge(extData.contractTier)}`}>
                            {extData.contractTier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.is_active ? "default" : "secondary"} className="gap-1 rounded-lg px-2 py-0.5 font-medium">
                            {p.is_active ? <CheckCircle className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3" />}
                            {p.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Bouton d'accès rapide au tableau de bord */}
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                              title="Voir la console 360° / Tableau de bord"
                            >
                              <Link to="/clients/$clientId" params={{ clientId: p.id }}>
                                <Eye className="h-4.5 w-4.5 text-primary" />
                              </Link>
                            </Button>

                            {/* Bouton de téléchargement de contrat direct */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => handleDownloadQuickContract(p)}
                              title="Télécharger le contrat client"
                            >
                              <Download className="h-4.5 w-4.5" />
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50">
                                <DropdownMenuLabel>Actions Client</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="rounded-lg">
                                  <Link to="/clients/$clientId" params={{ clientId: p.id }} className="cursor-pointer">
                                    <ExternalLink className="h-4 w-4 mr-2 text-primary" />
                                    Voir la console 360°
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadQuickContract(p)} className="rounded-lg cursor-pointer">
                                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                                  Générer & Télécharger contrat
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="rounded-lg">
                                  <Link to="/facturation" className="cursor-pointer">
                                    <CreditCard className="h-4 w-4 mr-2 text-emerald-500" />
                                    Consulter factures
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => toggleActive(p)} className="rounded-lg cursor-pointer text-destructive focus:text-destructive">
                                  {p.is_active ? "Désactiver l'accès" : "Réactiver l'accès"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
