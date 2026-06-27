import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MoreVertical, CheckCircle, XCircle, Users, Building2, ExternalLink, CreditCard, ShieldAlert, Laptop, Sparkles, FileText, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Offer } from "@/lib/offers";
import { DEFAULT_OFFERS } from "@/lib/offers";

const CLIENTS_PER_PAGE = 6;

export const Route = createFileRoute("/clients/")({
  head: () => ({ meta: [{ title: "Liste des Clients — SOC Platform" }] }),
  validateSearch: (search: Record<string, unknown>) => {
    return {
      refresh: (search.refresh as string) || undefined,
    };
  },
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

export const OFFER_MAX_PCS: Record<string, number> = {
  Bronze: 10,
  Argent: 25,
  Or:     50,
  Platine: 100,
};

// Version du schéma — tout changement de numéro réinitialise le cache client
const DATA_VERSION = 2;

export function getClientExtendedData(clientId: string, orgName: string): ClientExtendedData {
  const localKey = `client_ext_${clientId}`;
  const stored = typeof window !== "undefined" ? localStorage.getItem(localKey) : null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Si la version est à jour ET que les pcs ont été ajoutés manuellement → on retourne le cache
      if ((parsed as any)._v === DATA_VERSION) {
        return parsed as ClientExtendedData;
      }
      // Ancienne version (pcs auto-générés) → on réinitialise le parc à vide
      // mais on conserve le tier/contrat existant si disponible
      const fresh: ClientExtendedData = {
        ...parsed,
        pcs: [],
      };
      delete (fresh as any)._v;
      const withVersion = { ...fresh, _v: DATA_VERSION } as any;
      localStorage.setItem(localKey, JSON.stringify(withVersion));
      return fresh;
    } catch (e) {}
  }

  // Aucune donnée locale — création initiale avec parc vide
  let hash = 0;
  const seedString = clientId + (orgName || "Client");
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash * 31 + seedString.charCodeAt(i)) >>> 0;
  }

  const tiers: Array<"Bronze" | "Argent" | "Or" | "Platine"> = ["Bronze", "Argent", "Or", "Platine"];
  const contractTier = tiers[hash % tiers.length];
  const values = { Bronze: 100000, Argent: 250000, Or: 500000, Platine: 750000 };
  const contractValue = values[contractTier];
  const cyberScore = 70 + (hash % 26);

  const data: ClientExtendedData = {
    clientId,
    cyberScore,
    contractTier,
    contractValue,
    contractStart: new Date(Date.now() - 120 * 86400000).toISOString().split("T")[0],
    contractEnd:   new Date(Date.now() + 245 * 86400000).toISOString().split("T")[0],
    contractStatus: "Actif",
    pcs: [],
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(localKey, JSON.stringify({ ...data, _v: DATA_VERSION }));
  }
  return data;
}


const OFFER_NAMES: Record<string, string> = {
  Bronze: "Inova Secure",
  Argent: "Terranga Secure",
  Or: "Gainde Secure",
  Platine: "Gainde Secure Premium",
};

const OFFER_SLA: Record<string, { mttd: string; mttr: string; support: string }> = {
  Bronze: { mttd: "< 10 min", mttr: "< 30 min",  support: "8h-18h L-V"      },
  Argent: { mttd: "< 05 min", mttr: "< 15 min",  support: "24h/7 L-V"       },
  Or:     { mttd: "< 03 min", mttr: "< 10 min",  support: "24h/7/365 Dédié" },
  Platine:{ mttd: "< 01 min", mttr: "< 05 min",  support: "24h/7/365 Dédié+"},
};

export function downloadContractFile(orgName: string, fullName: string, extData: ClientExtendedData) {
  generateContractPDF(orgName, fullName, extData);
}

export function generateContractPDF(orgName: string, fullName: string, extData: ClientExtendedData) {
  const ref = `CONT-${extData.clientId.slice(0, 8).toUpperCase()}-${new Date(extData.contractStart).getFullYear()}`;
  const offerName = OFFER_NAMES[extData.contractTier] ?? extData.contractTier;
  const sla = OFFER_SLA[extData.contractTier] ?? { mttd: "< 15 min", mttr: "< 2 heures", support: "24h/7" };
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const pcRows = extData.pcs.map((pc, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
      <td style="padding:6px 10px;font-weight:600;color:#1e293b">${i + 1}</td>
      <td style="padding:6px 10px;font-family:monospace;font-size:11px">${pc.name}</td>
      <td style="padding:6px 10px;text-transform:uppercase;font-size:11px">${pc.os}</td>
      <td style="padding:6px 10px;font-family:monospace;font-size:11px">${pc.ip}</td>
      <td style="padding:6px 10px;font-family:monospace;font-size:11px">WZ-${pc.wazuhId}</td>
      <td style="padding:6px 10px">
        <span style="background:${pc.status==="active"?"#dcfce7":pc.status==="alert"?"#fef3c7":"#fee2e2"};color:${pc.status==="active"?"#166534":pc.status==="alert"?"#92400e":"#991b1b"};padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase">${pc.status}</span>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Contrat — ${offerName} — ${orgName}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  .page { max-width: 780px; margin: 0 auto; }

  /* Header */
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #f97316 100%); padding: 28px 32px; color: white; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center; }
  .logo-area { display: flex; flex-direction: column; gap: 4px; }
  .logo-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }
  .logo-sub  { font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #f97316; }
  .ref-area  { text-align: right; }
  .ref-label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; }
  .ref-val   { font-size: 13px; font-weight: 800; font-family: monospace; color: #fb923c; margin-top: 2px; }
  .ref-date  { font-size: 10px; color: #cbd5e1; margin-top: 4px; }

  /* Title band */
  .title-band { background: #f97316; padding: 10px 32px; }
  .title-band h1 { font-size: 13px; font-weight: 800; color: white; letter-spacing: 1px; text-transform: uppercase; }
  .title-band p  { font-size: 10px; color: #fed7aa; margin-top: 2px; }

  /* Status bar */
  .status-bar { background: #ecfdf5; border-bottom: 2px solid #10b981; padding: 8px 32px; display: flex; align-items: center; gap: 8px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
  .status-text { font-size: 10px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 1px; }

  /* Body */
  .body { padding: 24px 32px; }

  /* Section */
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #f97316; border-left: 3px solid #f97316; padding-left: 8px; margin-bottom: 10px; }

  /* Parties grid */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .party-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
  .party-role { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px; }
  .party-name { font-size: 13px; font-weight: 800; color: #0f172a; }
  .party-sub  { font-size: 10px; color: #64748b; margin-top: 3px; }

  /* Offer badge */
  .offer-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #f97316, #f59e0b); padding: 8px 16px; border-radius: 8px; color: white; font-weight: 800; font-size: 14px; margin-bottom: 12px; }
  .offer-badge span { font-size: 10px; opacity: 0.85; font-weight: 600; }

  /* SLA grid */
  .sla-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .sla-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #fff; text-align: center; }
  .sla-value { font-size: 14px; font-weight: 900; color: #0f172a; }
  .sla-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 2px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
  th { background: #1e293b; color: white; padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: left; }

  /* Clause */
  .clause-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px 14px; font-size: 11px; line-height: 1.6; color: #7c2d12; }

  /* Signatures */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .sig-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .sig-role { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #64748b; }
  .sig-name { font-size: 12px; font-weight: 800; color: #0f172a; margin: 6px 0; }
  .sig-badge { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; display: inline-block; }
  .sig-date  { font-size: 10px; color: #64748b; margin-top: 6px; }
  .sig-line  { border-top: 1.5px dashed #cbd5e1; margin: 10px 0 6px; }

  /* Footer */
  .footer { background: #0f172a; color: #64748b; padding: 10px 32px; font-size: 9px; display: flex; justify-content: space-between; align-items: center; border-radius: 0 0 4px 4px; margin-top: 24px; }
  .footer-brand { color: #f97316; font-weight: 800; font-size: 10px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { max-width: 100%; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-name">INOVA IRIS</div>
      <div class="logo-sub">Security Operations Center</div>
    </div>
    <div class="ref-area">
      <div class="ref-label">Référence contrat</div>
      <div class="ref-val">${ref}</div>
      <div class="ref-date">Généré le ${today}</div>
    </div>
  </div>

  <!-- Title band -->
  <div class="title-band">
    <h1>Contrat de Prestation de Cybersécurité SOC / EDR</h1>
    <p>Contrat de services de sécurité managée — Protection Endpoint & Surveillance Active</p>
  </div>

  <!-- Status bar -->
  <div class="status-bar">
    <div class="status-dot"></div>
    <div class="status-text">✓ Contrat signé électroniquement & en règle — Statut : ${extData.contractStatus}</div>
  </div>

  <div class="body">

    <!-- 1. Parties -->
    <div class="section">
      <div class="section-title">1. Parties contractantes</div>
      <div class="parties">
        <div class="party-box">
          <div class="party-role">Prestataire</div>
          <div class="party-name">INOVA CYBER SOC PLATFORM</div>
          <div class="party-sub">Représenté par l'équipe SOC d'Administration</div>
          <div class="party-sub" style="margin-top:4px;color:#f97316;font-weight:700">soc@inova-iris.sn</div>
        </div>
        <div class="party-box">
          <div class="party-role">Client</div>
          <div class="party-name">${orgName || "Non renseigné"}</div>
          <div class="party-sub">Représentant habilité : <strong>${fullName || "Non renseigné"}</strong></div>
        </div>
      </div>
    </div>

    <!-- 2. Offre & SLA -->
    <div class="section">
      <div class="section-title">2. Offre souscrite & Niveaux de service (SLA)</div>
      <div class="offer-badge">
        ${offerName}
        <span>— ${extData.contractValue.toLocaleString("fr-FR")} FCFA / mois</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:11px">
        <div><strong>Date d'effet :</strong> ${extData.contractStart}</div>
        <div><strong>Date d'échéance :</strong> ${extData.contractEnd}</div>
        <div><strong>Postes autorisés :</strong> ${extData.pcs.length} machine(s) active(s)</div>
        <div><strong>Support :</strong> ${sla.support}</div>
      </div>
      <div class="sla-grid">
        <div class="sla-card">
          <div class="sla-value">${sla.mttd}</div>
          <div class="sla-label">MTTD — Détection</div>
        </div>
        <div class="sla-card">
          <div class="sla-value">${sla.mttr}</div>
          <div class="sla-label">MTTR — Réponse</div>
        </div>
        <div class="sla-card">
          <div class="sla-value">99.98%</div>
          <div class="sla-label">Disponibilité</div>
        </div>
      </div>
    </div>

    <!-- 3. Inventaire -->
    <div class="section">
      <div class="section-title">3. Inventaire des terminaux sécurisés</div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Machine</th><th>OS</th><th>Adresse IP</th><th>ID Agent Wazuh</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>${pcRows}</tbody>
      </table>
    </div>

    <!-- 4. Clause -->
    <div class="section">
      <div class="section-title">4. Clause d'isolation active & Confidentialité</div>
      <div class="clause-box">
        ⚠ Le Client autorise formellement l'équipe SOC INOVA à exécuter une commande de mise en quarantaine réseau immédiate (Isolation EDR) sur toute machine répertoriée ci-dessus présentant un comportement d'infection avéré (chiffrement Ransomware, Bruteforce interne SSH, connexions C2 actives). Les deux parties s'engagent à maintenir une stricte confidentialité concernant les informations de sécurité, journaux d'événements et vulnérabilités détectées sur le réseau du client.
      </div>
    </div>

    <!-- 5. Signatures -->
    <div class="section">
      <div class="section-title">5. Signatures électroniques</div>
      <div class="signatures">
        <div class="sig-box">
          <div class="sig-role">Signataire Prestataire</div>
          <div class="sig-line"></div>
          <div class="sig-name">INOVA SECURITY SERVICES</div>
          <div><span class="sig-badge">✓ Signé électroniquement</span></div>
          <div class="sig-date">Date d'effet : ${extData.contractStart}</div>
        </div>
        <div class="sig-box">
          <div class="sig-role">Signataire Client</div>
          <div class="sig-line"></div>
          <div class="sig-name">${orgName || "Client"}</div>
          <div style="font-size:11px;color:#475569;margin-bottom:6px">${fullName || ""}</div>
          <div><span class="sig-badge">✓ Signé électroniquement</span></div>
          <div class="sig-date">Date de certification : ${extData.contractStart}</div>
        </div>
      </div>
    </div>

  </div><!-- /body -->

  <div class="footer">
    <div class="footer-brand">INOVA IRIS — SOC Platform</div>
    <div>${ref} • ${today} • Confidentiel</div>
    <div>© ${new Date().getFullYear()} INOVA Cyber SOC — Tous droits réservés</div>
  </div>

</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=1200,scrollbars=yes");
  if (!w) { alert("Autorisez les popups pour générer le PDF."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

interface Profile { id: string; email: string | null; full_name: string | null; organization: string | null; is_active: boolean; created_at: string; matricule?: string | null }
export const DEMO_CLIENTS: Profile[] = [
  { id: "demo-client-1", email: "contact@acme-corp.com", full_name: "Jean Dupont", organization: "Acme Corporation", is_active: true, created_at: new Date().toISOString(), matricule: "CLT-100001" },
  { id: "demo-client-2", email: "security@techflow.io", full_name: "Alice Martin", organization: "TechFlow Solutions", is_active: true, created_at: new Date().toISOString(), matricule: "CLT-100002" },
  { id: "demo-client-3", email: "it-admin@globex.net", full_name: "Robert Fox", organization: "Globex Network", is_active: false, created_at: new Date().toISOString(), matricule: "CLT-100003" },
];

interface RoleRow { user_id: string; role: AppRole }

function ClientsList() {
  const searchParams = useSearch({ from: "/clients/" });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Charger les offres depuis localStorage (catalogue offres)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("soc_catalogues_offres");
      if (stored) {
        const parsed = JSON.parse(stored) as Offer[];
        setOffers(parsed.length > 0 ? parsed : DEFAULT_OFFERS);
      } else {
        setOffers(DEFAULT_OFFERS);
      }
    } catch {
      setOffers(DEFAULT_OFFERS);
    }
  }, []);

  // Retourne l'offre correspondant à un contractTier (association par index/position)
  const getOfferForTier = (tier: string): Offer | undefined => {
    const activeOffers = offers.filter(o => o.isActive);
    const tierMap: Record<string, number> = { Bronze: 0, Argent: 1, Or: 2, Platine: 3 };
    const idx = tierMap[tier] ?? 0;
    return activeOffers[idx] ?? activeOffers[0];
  };

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      
      const roles = (r as RoleRow[]) ?? [];
      // Uniquement les profils avec le rôle "client" — créés via /clients/new
      const clientUserIds = new Set(roles.filter(x => x.role === "client").map(x => x.user_id));
      
      const allProfiles = (p as Profile[]) ?? [];
      const clientProfiles = allProfiles.filter(profile => clientUserIds.has(profile.id));
      
      setProfiles(clientProfiles);
    } catch (err) {
      console.error("Erreur lors du chargement des clients:", err);
      setProfiles([]);
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
      // Premier rechargement rapide
      load();
      // Deuxième rechargement après 2s pour s'assurer que user_roles est bien propagé
      const t1 = setTimeout(() => { load(); }, 2000);
      // Troisième rechargement après 5s comme filet de sécurité
      const t2 = setTimeout(() => { load(); }, 5000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
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
    setCurrentPage(1); // Retour à la page 1 à chaque changement de filtre
  }, [profiles, searchTerm, statusFilter]);

  const toggleActive = async (p: Profile) => {
    const toastId = toast.loading(`${p.is_active ? "Désactivation" : "Activation"} en cours...`);
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !p.is_active }).eq("id", p.id);
      if (error) throw error;
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

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / CLIENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProfiles = filteredProfiles.slice(
    (safeCurrentPage - 1) * CLIENTS_PER_PAGE,
    safeCurrentPage * CLIENTS_PER_PAGE
  );

  // Génère une fenêtre de pages à afficher (max 5)
  const getPageNumbers = () => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("…");
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
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
                  <TableHead className="font-semibold">ID Client</TableHead>
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
                  Array.from({ length: CLIENTS_PER_PAGE }).map((_, i) => (
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
                  paginatedProfiles.map(p => {
                    const extData = getClientExtendedData(p.id, p.organization || "Client");
                    const connectedPcs = extData.pcs.filter(pc => pc.status === "active" || pc.status === "alert" || pc.status === "isolated").length;
                    const offer = getOfferForTier(extData.contractTier);
                    const maxPcs = offer?.maxPcs ?? extData.pcs.length;
                    
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
                            <div className="font-mono font-semibold text-sm text-foreground group-hover:text-primary transition-colors tracking-wide">
                              {p.matricule?.startsWith("CLT-")
                                ? p.matricule
                                : p.matricule
                                  ? `CLT-${p.matricule}`
                                  : `CLT-${p.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{p.full_name ?? "—"}</div>
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
                              <span className="text-muted-foreground text-xs"> / {maxPcs} PC</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`px-2.5 py-1 rounded-lg ${getContractBadge(extData.contractTier)}`}>
                            {offer?.name ?? extData.contractTier}
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
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                              title="Voir la console 360°"
                            >
                              <Link to="/clients/$clientId" params={{ clientId: p.id }}>
                                <Eye className="h-4.5 w-4.5 text-primary" />
                              </Link>
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

          {/* ── Pagination en bas — style capture ── */}
          {!loading && filteredProfiles.length > 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-4 border-t border-border/30 bg-background/50">
              <span className="text-sm text-muted-foreground">
                Affichage de{" "}
                <span className="font-semibold text-foreground">{(safeCurrentPage - 1) * CLIENTS_PER_PAGE + 1}</span>
                {" "}à{" "}
                <span className="font-semibold text-foreground">{Math.min(safeCurrentPage * CLIENTS_PER_PAGE, filteredProfiles.length)}</span>
                {" "}sur{" "}
                <span className="font-semibold text-foreground">{filteredProfiles.length}</span>
                {" "}clients
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  {/* Précédent */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Numéros */}
                  {getPageNumbers().map((pg, idx) =>
                    pg === "…" ? (
                      <span key={`ellipsis-${idx}`} className="h-9 w-9 flex items-center justify-center text-sm text-muted-foreground select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={pg}
                        onClick={() => setCurrentPage(pg as number)}
                        className={`h-9 w-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                          safeCurrentPage === pg
                            ? "bg-orange-500 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/40"
                            : "border border-border/60 text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {pg}
                      </button>
                    )
                  )}

                  {/* Suivant */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
