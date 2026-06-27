import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, Building, Mail, Phone, Globe, Shield, ArrowLeft, Loader2, Save, Power, PowerOff, KeyRound, Laptop, Download, UploadCloud, Copy, Check, Activity, FileText, Sparkles, Cpu, AlertTriangle, ShieldAlert, Terminal, Network, Zap, Sliders, Settings, RefreshCw, AlertCircle, CircleDot, Play, Lock, Trash2, FolderSync, MapPin, Hash, Wifi, HardDrive, Plus, Monitor, Edit3, ChevronRight, ChevronDown, TrendingUp, Clock, Server, ExternalLink, CreditCard, CalendarDays, CheckCircle2, XCircle, AlertCircle as AlertCircleIcon, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getClientExtendedData, downloadContractFile, generateContractPDF, ClientExtendedData, DEMO_CLIENTS } from "./clients.index";

/* ── Mapping offres réelles (aligné sur src/lib/offers.ts) ── */
const OFFER_BY_TIER: Record<string, {
  name: string; color: string; maxPcs: number;
  mttd: string; mttr: string; support: string;
}> = {
  Bronze:  { name: "Inova Secure",          color: "#f97316", maxPcs: 10,  mttd: "< 10 min", mttr: "< 30 min",  support: "8h-18h L-V"       },
  Argent:  { name: "Terranga Secure",        color: "#3b82f6", maxPcs: 25,  mttd: "< 05 min", mttr: "< 15 min",  support: "24h/7 L-V"         },
  Or:      { name: "Gainde Secure",          color: "#f59e0b", maxPcs: 50,  mttd: "< 03 min", mttr: "< 10 min",  support: "24h/7/365 Dédié"   },
  Platine: { name: "Gainde Secure Premium",  color: "#8b5cf6", maxPcs: 100, mttd: "< 01 min",  mttr: "< 05 min",  support: "24h/7/365 Dédié+" },
};

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
  const [activeTab, setActiveTab] = useState<"overview" | "pcs" | "contract" | "alerts">("pcs");
  
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

  // Nouveaux états de simulation temps réel EDR / Wazuh
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null);
  const [pcTelemetry, setPcTelemetry] = useState<Record<string, {
    cpu: number;
    ram: number;
    rxSpeed: number;
    txSpeed: number;
    procCount: number;
    socketsCount: number;
    packetsTotal: number;
    wazuhStatus: "active" | "disconnected" | "alert" | "isolated";
  }>>({});
  const [logsStream, setLogsStream] = useState<Array<{
    id: string;
    time: string;
    pcName: string;
    source: "Wazuh" | "VirusTotal" | "MISP" | "SOAR" | "DFIR-IRIS" | "TheHive";
    type: "info" | "warning" | "alert";
    message: string;
  }>>([]);
  const [terminalHistory, setTerminalHistory] = useState<Array<{
    type: "input" | "output" | "error" | "system";
    text: string;
  }>>([
    { type: "system", text: "=== CONSOLE AGENT WAZUH EDR REMOTE SHELL v4.14.5 ===" },
    { type: "system", text: "Tapez 'help' pour lister les commandes de diagnostic et remédiation." }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [activePlaybook, setActivePlaybook] = useState<string | null>(null);
  const [playbookStep, setPlaybookStep] = useState<number>(0);
  const [playbookLogs, setPlaybookLogs] = useState<string[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [wazuhPassword, setWazuhPassword] = useState("");
  const [deployGuideOpen, setDeployGuideOpen] = useState(false);

  // Modal ajout de machine
  const [addMachineOpen, setAddMachineOpen] = useState(false);
  const [addingMachine, setAddingMachine] = useState(false);
  const [newMachineForm, setNewMachineForm] = useState({
    name: "",
    ip: "",
    owner: "",
    os: "windows" as "windows" | "linux" | "macos",
    mac: "",
    department: "",
  });

  // Initialisation des données de télémétrie
  useEffect(() => {
    if (!extData) return;
    
    const initialTelemetry: typeof pcTelemetry = {};
    extData.pcs.forEach(pc => {
      initialTelemetry[pc.id] = {
        cpu: pc.cpu,
        ram: pc.ram,
        rxSpeed: pc.status === "active" || pc.status === "alert" ? Math.floor(Math.random() * 200 + 30) : 0,
        txSpeed: pc.status === "active" || pc.status === "alert" ? Math.floor(Math.random() * 50 + 5) : 0,
        procCount: pc.status === "active" || pc.status === "alert" ? Math.floor(Math.random() * 30 + 50) : 0,
        socketsCount: pc.status === "active" || pc.status === "alert" ? Math.floor(Math.random() * 10 + 4) : 0,
        packetsTotal: pc.status === "active" || pc.status === "alert" ? Math.floor(Math.random() * 1000 + 500) : 0,
        wazuhStatus: (pc as any).wazuhStatus || pc.status
      };
    });
    
    setPcTelemetry(prev => {
      const merged = { ...initialTelemetry };
      Object.keys(prev).forEach(key => {
        if (merged[key]) {
          merged[key].wazuhStatus = prev[key].wazuhStatus;
        }
      });
      return merged;
    });

    // Logs initiaux
    const initialLogs = [
      {
        id: "log-1",
        time: new Date(Date.now() - 30000).toLocaleTimeString("fr-FR"),
        pcName: extData.pcs[0]?.name || "endpoint",
        source: "Wazuh" as const,
        type: "info" as const,
        message: "Connexion EDR sécurisée établie avec le Wazuh Manager (AES-256-GCM)."
      },
      {
        id: "log-2",
        time: new Date(Date.now() - 25000).toLocaleTimeString("fr-FR"),
        pcName: extData.pcs[1]?.name || "endpoint",
        source: "VirusTotal" as const,
        type: "info" as const,
        message: "Scan de réputation des processus en arrière-plan : 100% de conformité."
      },
      {
        id: "log-3",
        time: new Date(Date.now() - 20000).toLocaleTimeString("fr-FR"),
        pcName: extData.pcs[0]?.name || "endpoint",
        source: "MISP" as const,
        type: "info" as const,
        message: "Corrélation de flux CTI : 1,482 signatures de menaces actives synchronisées."
      }
    ];
    setLogsStream(prev => prev.length === 0 ? initialLogs : prev);

    if (!selectedPcId) {
      const firstActive = extData.pcs.find(pc => pc.status === "active" || pc.status === "alert");
      if (firstActive) {
        setSelectedPcId(firstActive.id);
      }
    }

    // Auto-expand deployment guide only when agents are missing or disconnected
    const allReady = extData.pcs.length > 0 && extData.pcs.every(pc => pc.status !== "disconnected");
    setDeployGuideOpen(!allReady);
  }, [extData]);

  // Simulation de télémétrie et logs en continu
  useEffect(() => {
    if (!extData || activeTab !== "pcs") return;

    const interval = setInterval(() => {
      setPcTelemetry(prev => {
        const next = { ...prev };
        extData.pcs.forEach(pc => {
          if (!next[pc.id]) return;

          const currentStatus = next[pc.id].wazuhStatus;

          if (currentStatus === "disconnected" || currentStatus === "isolated") {
            next[pc.id] = {
              ...next[pc.id],
              cpu: 0,
              ram: currentStatus === "isolated" ? 8 : 0,
              rxSpeed: 0,
              txSpeed: 0,
              procCount: currentStatus === "isolated" ? 18 : 0,
              socketsCount: currentStatus === "isolated" ? 1 : 0,
            };
            return;
          }

          const cpuDrift = Math.floor(Math.random() * 8 - 4);
          const ramDrift = Math.floor(Math.random() * 4 - 2);
          const rxDrift = Math.floor(Math.random() * 30 - 15);
          const txDrift = Math.floor(Math.random() * 8 - 4);

          next[pc.id] = {
            ...next[pc.id],
            cpu: Math.max(2, Math.min(98, (next[pc.id].cpu || 15) + cpuDrift)),
            ram: Math.max(10, Math.min(95, (next[pc.id].ram || 40) + ramDrift)),
            rxSpeed: Math.max(5, Math.min(800, (next[pc.id].rxSpeed || 50) + rxDrift)),
            txSpeed: Math.max(1, Math.min(200, (next[pc.id].txSpeed || 15) + txDrift)),
            procCount: Math.max(45, Math.min(120, (next[pc.id].procCount || 65) + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
            packetsTotal: (next[pc.id].packetsTotal || 100) + Math.floor(Math.random() * 6 + 1),
          };
        });
        return next;
      });

      if (Math.random() > 0.7) {
        const activePcs = extData.pcs.filter(pc => pc.status === "active" || pc.status === "alert");
        if (activePcs.length > 0) {
          const randomPc = activePcs[Math.floor(Math.random() * activePcs.length)];
          const sources: Array<"Wazuh" | "VirusTotal" | "MISP" | "SOAR" | "DFIR-IRIS" | "TheHive"> = ["Wazuh", "VirusTotal", "MISP", "SOAR"];
          const source = sources[Math.floor(Math.random() * sources.length)];
          
          let message = "";
          if (source === "Wazuh") {
            const msgs = [
              "Syscheck : vérification périodique d'intégrité terminée. Fichiers système OK.",
              "Analyse Rootcheck : conformité noyau 100%. Aucun élément furtif détecté.",
              "Agent EDR : battement de cœur (heartbeat) envoyé avec succès au SOC Hub."
            ];
            message = msgs[Math.floor(Math.random() * msgs.length)];
          } else if (source === "VirusTotal") {
            message = "Vérification des processus actifs : hashs validés propres par l'intelligence collective.";
          } else if (source === "MISP") {
            const socketMsgs = [
              "DNS reputation check : requête sortante vers les APIs autorisées validée.",
              "Socket reputation check : aucune adresse IP de commande et contrôle (C2) détectée.",
              "CTI Correlation : socket actif analysé avec succès contre les indicateurs de compromission."
            ];
            message = socketMsgs[Math.floor(Math.random() * socketMsgs.length)];
          } else if (source === "SOAR") {
            message = "SOAR Connector : synchronisation des règles locales de pare-feu terminée.";
          }

          addGlobalLog(randomPc.name, source, "info", message);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [extData, activeTab]);

  const addGlobalLog = (pcName: string, source: any, type: "info" | "warning" | "alert", message: string) => {
    setLogsStream(prev => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString("fr-FR"),
        pcName,
        source,
        type,
        message
      },
      ...prev.slice(0, 24)
    ]);
  };

  const triggerSoarPlaybook = (type: string, pc: any) => {
    if (activePlaybook) return;

    setActivePlaybook(type);
    setPlaybookStep(1);
    setPlaybookLogs([]);

    const logList: string[] = [];
    const addPlaybookLog = (msg: string) => {
      logList.push(`[${new Date().toLocaleTimeString("fr-FR")}] ${msg}`);
      setPlaybookLogs([...logList]);
    };

    if (type === "ransomware") {
      addPlaybookLog("Déclenchement du Playbook SOAR : Confinement ransomware actif.");
      addPlaybookLog("Appel du serveur d'orchestration Shuffle (IP: 10.0.0.8)... OK.");

      setTimeout(() => {
        setPlaybookStep(2);
        addPlaybookLog("Étape 2 : Blocage immédiat des flux réseau (Wazuh Active Response).");
        addPlaybookLog("Application de la règle de quarantaine sur le terminal...");
        
        setPcTelemetry(prev => ({
          ...prev,
          [pc.id]: {
            ...prev[pc.id],
            wazuhStatus: "isolated"
          }
        }));

        if (extData) {
          const updatedPcs = extData.pcs.map(p => {
            if (p.id === pc.id) {
              return { ...p, status: "isolated" as const };
            }
            return p;
          });
          const updatedExt = { ...extData, pcs: updatedPcs };
          setExtData(updatedExt);
          localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updatedExt));
        }

        toast.warning("PC isolé via SOAR", {
          description: `Le terminal ${pc.name} a été confiné par mesure de protection active.`
        });
        addGlobalLog(pc.name, "SOAR", "warning", "Ransomware détecté. Le terminal a été placé en isolation active.");
      }, 1500);

      setTimeout(() => {
        setPlaybookStep(3);
        addPlaybookLog("Étape 3 : Génération automatique d'un ticket d'incident dans TheHive.");
        addPlaybookLog("Création de l'alerte #CASE-1042 avec sévérité CRITIQUE.");
        addGlobalLog(pc.name, "TheHive", "alert", "Alerte de sécurité majeure #CASE-1042 générée : ransomware stoppé.");
      }, 3000);

      setTimeout(() => {
        setPlaybookStep(4);
        addPlaybookLog("Étape 4 : Synchronisation forensique avec DFIR-IRIS.");
        addPlaybookLog("Exportation des journaux Sysmon de l'incident IRIS-CASE-1042.");
        addPlaybookLog("[✓] Playbook SOAR d'isolation terminé. Menace neutralisée avec succès.");
        setPlaybookStep(5);
        addGlobalLog(pc.name, "DFIR-IRIS", "info", "Incident IRIS-CASE-1042 initialisé pour analyse forensique complète.");

        setTimeout(() => {
          setActivePlaybook(null);
        }, 3000);
      }, 4500);
    } else if (type === "vt-audit") {
      addPlaybookLog("Déclenchement du Playbook SOAR : Scan de réputation à grande échelle (VT).");
      addPlaybookLog("Extraction des hashs SHA256 des processus actifs en mémoire...");
      
      setTimeout(() => {
        setPlaybookStep(2);
        addPlaybookLog("Étape 2 : Requêtes API parallélisées vers les serveurs de réputation.");
        addPlaybookLog("Soumission de 74 signatures d'exécutables...");
      }, 1200);

      setTimeout(() => {
        setPlaybookStep(3);
        addPlaybookLog("Étape 3 : Corrélation des détections (Taux d'infection requis : 0).");
        addPlaybookLog("Vérification terminée. Aucun binaire classé à risque.");
      }, 2400);

      setTimeout(() => {
        setPlaybookStep(4);
        addPlaybookLog("Étape 4 : Rapports archivés. Zéro menace détectée.");
        addPlaybookLog("[✓] Audit de réputation SOAR terminé.");
        setPlaybookStep(5);
        setTimeout(() => {
          setActivePlaybook(null);
        }, 2000);
      }, 3600);
    } else if (type === "lockdown") {
      addPlaybookLog("Déclenchement du Playbook SOAR : Sécurisation préventive des ports distants.");
      addPlaybookLog("Audit des ports locaux d'accès à distance : RDP (3389), SSH (22), WinRM (5985)...");
      
      setTimeout(() => {
        setPlaybookStep(2);
        addPlaybookLog("Étape 2 : Déploiement des stratégies de filtrage par le SOC Manager.");
        addPlaybookLog("Application de règles de pare-feu de blocage des ports SSH/RDP...");
      }, 1500);

      setTimeout(() => {
        setPlaybookStep(3);
        addPlaybookLog("Étape 3 : Audit de verrouillage (nmap simulation). Ports fermés.");
      }, 3000);

      setTimeout(() => {
        setPlaybookStep(4);
        addPlaybookLog("Étape 4 : Exportation des politiques appliquées vers DFIR-IRIS.");
        addPlaybookLog("[✓] Playbook de fermeture des ports terminé.");
        setPlaybookStep(5);
        toast.success("Ports verrouillés avec succès", {
          description: `Les ports d'administration à distance sur ${pc.name} ont été restreints.`
        });
        addGlobalLog(pc.name, "SOAR", "info", "Stratégie de blocage préventif des ports distants déployée.");
        setTimeout(() => {
          setActivePlaybook(null);
        }, 2000);
      }, 4500);
    }
  };

  const executeTerminalCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newHistory = [...terminalHistory, { type: "input" as const, text: `$ ${trimmed}` }];
    setTerminalHistory(newHistory);
    setTerminalInput("");

    const parts = trimmed.split(" ");
    const primary = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ").toLowerCase();

    const activePc = extData?.pcs.find(pc => pc.id === selectedPcId);
    if (!activePc) {
      setTerminalHistory(prev => [...prev, { type: "error" as const, text: "Erreur : Aucun terminal EDR actif sélectionné." }]);
      return;
    }

    const telemetry = pcTelemetry[activePc.id];

    setTimeout(() => {
      if (primary === "clear") {
        setTerminalHistory([]);
        return;
      }

      if (primary === "help") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: "=== COMMANDES DE DIAGNOSTIC ET REMÉDIATION DISPONIBLES ===" },
          { type: "output" as const, text: "  wazuh status       - Statut de l'agent, clés de chiffrement et disponibilité EDR" },
          { type: "output" as const, text: "  syscheck --verify  - Déclenche un audit d'intégrité des fichiers (FIM) à la demande" },
          { type: "output" as const, text: "  vt-scan --running  - Recherche de menaces : analyse des hashs des processus en mémoire sur VirusTotal" },
          { type: "output" as const, text: "  misp-check --net   - Analyse des ports et sockets réseau ouverts contre la base d'IOC MISP" },
          { type: "output" as const, text: "  soar --remediate   - Exécute le playbook Shuffle d'isolation active ransomware" },
          { type: "output" as const, text: "  dfir --dump-ram    - Lance une extraction légale (forensique) de la mémoire RAM" },
          { type: "output" as const, text: "  clear              - Efface la console" }
        ]);
        return;
      }

      if (primary === "wazuh" && arg === "status") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: `Connecting to Wazuh Manager (10.0.0.1:1514)... Connecté.` },
          { type: "output" as const, text: `Statut de l'agent : ${telemetry?.wazuhStatus.toUpperCase()}` },
          { type: "output" as const, text: `Identifiant de l'agent : WZ-${activePc.wazuhId}` },
          { type: "output" as const, text: `Uptime : 14 jours, 3 heures, 21 minutes` },
          { type: "output" as const, text: `Version de l'agent : Wazuh EDR v4.14.5` },
          { type: "output" as const, text: `Canaux de surveillance : File Integrity (Actif), Rootkit Check (Actif), Process Reputation (Actif).` },
          { type: "output" as const, text: `Clé d'authentification active : RSA-3072 Validée.` }
        ]);
        return;
      }

      if (primary === "syscheck" && arg === "--verify") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: `[+] Déclenchement de l'audit d'intégrité système (Syscheck FIM)...` },
          { type: "output" as const, text: `[+] Indexation des fichiers système dans C:\\Windows\\System32 et /bin...` },
          { type: "output" as const, text: `[+] Calcul et comparaison des signatures MD5/SHA256 avec la base de référence...` },
          { type: "output" as const, text: `[+] Audit terminé. 1,482 fichiers analysés.` },
          { type: "output" as const, text: `[+] Résultat : 100% de conformité. 0 modification, 0 suppression détectée.` }
        ]);
        addGlobalLog(activePc.name, "Wazuh", "info", "Scan d'intégrité des fichiers système terminé - 0 anomalie.");
        return;
      }

      if (primary === "vt-scan" && arg === "--running") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: `[+] Récupération de la liste des hashs des binaires exécutés en mémoire...` },
          { type: "output" as const, text: `[+] Soumission de ${telemetry?.procCount || 65} hashs d'applications à l'API de VirusTotal...` },
          { type: "output" as const, text: `[+] Analyse d'intégrité en cours... [||||||||||||||||||||||||||||||] 100%` },
          { type: "output" as const, text: `[+] Analyse complète achevée :` },
          { type: "output" as const, text: `    - Binaires vérifiés : ${telemetry?.procCount || 65} processus.` },
          { type: "output" as const, text: `    - Détections de logiciels malveillants : 0 détections / 76 moteurs antiviraux.` },
          { type: "output" as const, text: `    - Processus validés propres : explorer.exe, svchost.exe, wazuh-agent.exe, chrome.exe.` }
        ]);
        addGlobalLog(activePc.name, "VirusTotal", "info", `Scan VT de la mémoire complet - ${telemetry?.procCount || 65} processus sains.`);
        return;
      }

      if (primary === "misp-check" && arg === "--net") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: `[+] Extraction des sockets et connexions réseau actives (netstat audit)...` },
          { type: "output" as const, text: `[+] Découverte de ${telemetry?.socketsCount || 5} sockets TCP/UDP actives.` },
          { type: "output" as const, text: `[+] Interrogation de la base locale de Cyber Threat Intelligence MISP...` },
          { type: "output" as const, text: `[+] Comparaison des IPs distantes avec les flux d'IOC de menaces (12 flux actifs)...` },
          { type: "output" as const, text: `[+] Sockets validées :` },
          { type: "output" as const, text: `    - ${activePc.ip}:51421 -> 10.0.0.1:1514 (Wazuh SOC Server) -> [PROPRE]` },
          { type: "output" as const, text: `    - ${activePc.ip}:49204 -> 142.250.178.14 (DNS Google) -> [PROPRE]` },
          { type: "output" as const, text: `[+] Résultat : Aucun indicateur de compromission (IOC) détecté sur les flux réseau.` }
        ]);
        addGlobalLog(activePc.name, "MISP", "info", "Sockets corrélés avec les bases MISP - Aucune adresse IP suspecte détectée.");
        return;
      }

      if (primary === "soar" && arg === "--remediate") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "error" as const, text: `[!] ALERTE CRITIQUE : Déclenchement de l'isolation active à la demande !` }
        ]);
        triggerSoarPlaybook("ransomware", activePc);
        return;
      }

      if (primary === "dfir" && arg === "--dump-ram") {
        setTerminalHistory(prev => [
          ...prev,
          { type: "output" as const, text: `[+] Lancement de l'outil d'acquisition mémoire forensics à distance (DFIR)...` },
          { type: "output" as const, text: `[+] Établissement du buffer mémoire local (Fichier cible: C:\\Temp\\Forensics\\RAM.raw)...` },
          { type: "output" as const, text: `[+] Capture de la mémoire RAM en cours... [|||||||||||||||||||||||||] 100%` },
          { type: "output" as const, text: `[+] Compression de l'image et calcul de la somme de contrôle SHA256...` },
          { type: "output" as const, text: `[+] Hash SHA256 : 7f83b2a0c8d1e4e2a7b8e918239ac82d17482810a7b4819e917d23a7b8b2e10a` },
          { type: "output" as const, text: `[+] Transfert sécurisé de l'image vers le dépôt DFIR-IRIS Case Manager...` },
          { type: "output" as const, text: `[+] Rapport d'extraction forensique sauvegardé sous l'identifiant IRIS-CASE-${activePc.wazuhId}.` }
        ]);
        addGlobalLog(activePc.name, "DFIR-IRIS", "info", "Acquisition de la mémoire RAM effectuée avec succès - Exportée vers IRIS.");
        return;
      }

      setTerminalHistory(prev => [
        ...prev,
        { type: "error" as const, text: `Commande inconnue : '${primary}'. Tapez 'help' pour voir la liste des commandes.` }
      ]);
    }, 300);
  };

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
      let data = null;
      let error = null;
      
      const isDemo = DEMO_CLIENTS.find(d => d.id === clientId);
      
      if (isDemo) {
        data = isDemo;
      } else {
        const result = await supabase
          .from("profiles")
          .select("*")
          .eq("id", clientId)
          .single();
        data = result.data;
        error = result.error;
      }
        
      if (error) throw error;
      
      if (!data) throw new Error("Aucune donnée renvoyée");
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
      const isDemo = DEMO_CLIENTS.some(d => d.id === clientId);
      
      if (!isDemo) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: form.fullName,
            organization: form.organization,
          })
          .eq("id", clientId);
          
        if (error) throw error;
      }

      // Sauvegarde des champs complémentaires simulés localement
      localStorage.setItem(`phone_${clientId}`, form.phone);
      localStorage.setItem(`web_${clientId}`, form.website);

      // Si l'organisation a changé, mettre à jour le contrat généré
      if (extData && form.organization !== extData.clientId) {
        const updatedExt = { ...extData };
        localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updatedExt));
      }

      toast.success("Profil mis à jour", { description: "Les modifications ont été enregistrées avec succès." });
      setEditMode(false);
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
      const isDemo = DEMO_CLIENTS.some(d => d.id === clientId);
      
      if (!isDemo) {
        const { error } = await supabase
          .from("profiles")
          .update({ is_active: !profile.is_active })
          .eq("id", clientId);
          
        if (error) throw error;
      }
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
    generateContractPDF(form.organization || "Client", form.fullName || "Représentant", extData);
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

  const handleAddMachine = () => {
    if (!newMachineForm.name.trim()) { toast.error("Nom de la machine requis"); return; }
    if (!newMachineForm.ip.trim()) { toast.error("Adresse IP requise"); return; }
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(newMachineForm.ip.trim())) { toast.error("Adresse IP invalide"); return; }
    if (!newMachineForm.owner.trim()) { toast.error("Nom du propriétaire requis"); return; }
    if (!extData) return;

    setAddingMachine(true);
    setTimeout(() => {
      const newId = `${extData.clientId}-pc-${Date.now()}`;
      const newPc = {
        id: newId,
        name: newMachineForm.name.trim(),
        os: newMachineForm.os,
        ip: newMachineForm.ip.trim(),
        status: "active" as const,
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: Math.floor(Math.random() * 30) + 15,
        lastSeen: "À l'instant",
        wazuhId: String(300 + extData.pcs.length).padStart(3, "0"),
        owner: newMachineForm.owner.trim(),
        mac: newMachineForm.mac.trim(),
        department: newMachineForm.department.trim(),
      };
      const updated = { ...extData, pcs: [...extData.pcs, newPc] };
      setExtData(updated);
      localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updated));
      toast.success("Machine enregistrée !", {
        description: `${newPc.name} (${newPc.ip}) est maintenant surveillée par l'agent EDR.`,
      });
      setAddMachineOpen(false);
      setNewMachineForm({ name: "", ip: "", owner: "", os: "windows", mac: "", department: "" });
      setAddingMachine(false);
    }, 1200);
  };

  const getScripts = () => {
    const cloudManager = "wucy2fi80s80.cloud.wazuh.com";
    const groupName = form.organization ? form.organization.toLowerCase().replace(/[^a-z0-9]/g, "-") : "client-default";
    return {
      windows: [
        `# Étape 1 : Télécharger l'agent Wazuh`,
        `Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi" -OutFile "$env:TEMP\\wazuh-agent.msi"`,
        ``,
        `# Étape 2 : Installer et enregistrer sur Wazuh Cloud`,
        `msiexec.exe /i "$env:TEMP\\wazuh-agent.msi" WAZUH_MANAGER="${cloudManager}" WAZUH_REGISTRATION_SERVER="${cloudManager}" WAZUH_AGENT_GROUP="${groupName}" /q`,
        ``,
        `# Étape 3 : Démarrer l'agent`,
        `NET START WazuhSvc`,
      ].join("\n"),
      linux: [
        `# Étape 1 : Ajouter le dépôt Wazuh`,
        `curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import`,
        `echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list`,
        ``,
        `# Étape 2 : Installer et enregistrer l'agent`,
        `WAZUH_MANAGER="${cloudManager}" WAZUH_AGENT_GROUP="${groupName}" apt-get install -y wazuh-agent`,
        ``,
        `# Étape 3 : Activer et démarrer`,
        `systemctl enable --now wazuh-agent`,
      ].join("\n"),
      macos: [
        `# Étape 1 : Télécharger l'agent`,
        `curl -so /tmp/wazuh-agent.pkg https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.intel64.pkg`,
        ``,
        `# Étape 2 : Installer et enregistrer l'agent`,
        `WAZUH_MANAGER="${cloudManager}" WAZUH_AGENT_GROUP="${groupName}" installer -pkg /tmp/wazuh-agent.pkg -target /`,
        ``,
        `# Étape 3 : Démarrer l'agent`,
        `/Library/Ossec/bin/wazuh-control start`,
      ].join("\n"),
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

  const offerMeta = OFFER_BY_TIER[extData.contractTier] ?? OFFER_BY_TIER.Bronze;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* ── HEADER ── */}
        <div className="relative mb-5 rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-[0_2px_24px_0_rgba(0,0,0,0.06)]">
          {/* Subtle warm gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-white to-slate-50/30 pointer-events-none" />
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300" />

          <div className="relative z-10 px-6 pt-5 pb-5">

            {/* Row 1 : breadcrumb + actions */}
            <div className="flex items-center justify-between mb-5">
              <Button variant="ghost" size="sm" asChild
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl gap-2 border border-slate-200 text-xs h-8 font-medium transition-all">
                <Link to="/clients">
                  <ArrowLeft className="h-3.5 w-3.5" /> Retour aux clients
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline"
                  className="h-8 rounded-xl gap-2 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                  onClick={() => navigate({ to: "/admin/$userId", params: { userId: profile.id } })}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Espace client
                </Button>
                <Button size="sm" onClick={toggleActive}
                  className={`h-8 rounded-xl gap-2 font-bold text-xs shadow-sm transition-all ${
                    profile.is_active
                      ? "bg-rose-500 hover:bg-rose-600 text-white border border-rose-400/60"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400/60"
                  }`}>
                  {profile.is_active
                    ? <><PowerOff className="h-3.5 w-3.5" /> Suspendre</>
                    : <><Power className="h-3.5 w-3.5" /> Activer</>}
                </Button>
              </div>
            </div>

            {/* Row 2 : identité */}
            <div className="flex items-center gap-4 mb-5">
              {/* Logo/initiales */}
              <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)", border: "1.5px solid #fed7aa" }}>
                <Building className="h-6 w-6" style={{ color: "#f97316" }} />
              </div>

              {/* Nom + badge + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <h1 className="text-[19px] font-black text-slate-900 tracking-tight truncate leading-none">
                    {form.organization || form.fullName || profile.email}
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    profile.is_active
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.is_active ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {profile.is_active ? "Abonnement Actif" : "Suspendu"}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-wrap text-[12px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-slate-600 font-medium">{form.fullName || "—"}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-slate-500">{profile.email}</span>
                  </span>
                  {form.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-300" />
                      <span className="text-slate-500">{form.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Row 3 : KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { icon: Shield,     label: "Score Cyber",   value: `${extData.cyberScore}%`,                       sub: "Conformité EDR",    color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", iconColor: "#34d399" },
                { icon: Laptop,     label: "PC Connectés",  value: `${connectedPcs}/${extData.pcs.length}`,         sub: "Agents actifs",     color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", iconColor: "#38bdf8" },
                { icon: TrendingUp, label: "Offre",         value: offerMeta.name,                                 sub: extData.contractStatus, color: offerMeta.color, bg: "#fff7ed", border: "#fed7aa", iconColor: offerMeta.color },
                { icon: Clock,      label: "MTTR SOC",      value: offerMeta.mttr,                                 sub: "Temps de réponse",  color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe", iconColor: "#a78bfa" },
              ].map(kpi => (
                <div key={kpi.label} className="rounded-xl px-3.5 py-3 border transition-shadow hover:shadow-sm"
                  style={{ backgroundColor: kpi.bg, borderColor: kpi.border }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.iconColor }} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                  </div>
                  <p className="text-[15px] font-black leading-none truncate" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ONGLETS ── */}
        <div className="flex gap-0 mb-5 bg-white border border-slate-200/90 rounded-xl px-1.5 shadow-sm">
          {[
            { key: "pcs",       label: `PC Connectés (${connectedPcs})`,  icon: Laptop     },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all duration-200 rounded-lg my-1 ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}>
                <Icon className={`h-4 w-4 ${active ? "text-orange-500" : ""}`} />
                {tab.label}
                {active && <span className="absolute bottom-[-1px] left-3 right-3 h-0.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full opacity-0" />}
              </button>
            );
          })}
        </div>

        {/* Onglet : PC CONNECTÉS & AGENT DEPLOYER */}
        {activeTab === "pcs" && (
          <div className="space-y-6">

            {/* ── GUIDE D'ENRÔLEMENT WAZUH CLOUD ── */}
            {(() => {
              const offerInfo = OFFER_BY_TIER[extData.contractTier] ?? OFFER_BY_TIER.Bronze;
              const groupName = form.organization
                ? form.organization.toLowerCase().replace(/[^a-z0-9]/g, "-")
                : "client-default";
              const cloudManager = "wucy2fi80s80.cloud.wazuh.com";
              const usedPcs = extData.pcs.length;
              const maxPcs = offerInfo.maxPcs;
              const quotaPct = Math.round((usedPcs / maxPcs) * 100);
              const allConnected = extData.pcs.every(pc => pc.status !== "disconnected");
              const agentInstalled = usedPcs > 0 && extData.pcs.some(p => p.status === "active");

              const pwdParam = wazuhPassword ? ` WAZUH_REGISTRATION_PASSWORD="${wazuhPassword}"` : ` WAZUH_REGISTRATION_PASSWORD="VOTRE_MOT_DE_PASSE"`;
              const pwdParamLinux = wazuhPassword ? ` WAZUH_REGISTRATION_PASSWORD="${wazuhPassword}"` : ` WAZUH_REGISTRATION_PASSWORD="VOTRE_MOT_DE_PASSE"`;

              const osScripts: Record<string, { label: string; badge: string; steps: { title: string; cmd: string; comment: string }[] }> = {
                windows: {
                  label: "Windows",
                  badge: "PowerShell Admin",
                  steps: [
                    {
                      title: "Télécharger l'agent (.msi)",
                      comment: "# Étape 1 — Exécuter dans PowerShell en tant qu'Administrateur",
                      cmd: `Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi" -OutFile "$env:TEMP\\wazuh-agent.msi"`,
                    },
                    {
                      title: "Installer & enregistrer sur Wazuh Cloud",
                      comment: "# Étape 2 — Installation avec mot de passe d'enrollment",
                      cmd: `msiexec.exe /i "$env:TEMP\\wazuh-agent.msi" WAZUH_MANAGER="${cloudManager}" WAZUH_REGISTRATION_SERVER="${cloudManager}"${pwdParam} WAZUH_AGENT_GROUP="${groupName}" /q`,
                    },
                    {
                      title: "Démarrer le service",
                      comment: "# Étape 3 — Démarrage du service Wazuh",
                      cmd: `NET START WazuhSvc`,
                    },
                  ],
                },
                linux: {
                  label: "Linux",
                  badge: "Terminal root",
                  steps: [
                    {
                      title: "Ajouter le dépôt Wazuh",
                      comment: "# Étape 1 — Ajout du dépôt officiel Wazuh",
                      cmd: `curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import\necho "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list && apt-get update`,
                    },
                    {
                      title: "Installer & enregistrer l'agent",
                      comment: "# Étape 2 — Installation avec mot de passe d'enrollment",
                      cmd: `WAZUH_MANAGER="${cloudManager}"${pwdParamLinux} WAZUH_AGENT_GROUP="${groupName}" apt-get install -y wazuh-agent`,
                    },
                    {
                      title: "Activer & démarrer",
                      comment: "# Étape 3 — Activation du service au démarrage",
                      cmd: `systemctl enable --now wazuh-agent`,
                    },
                  ],
                },
                macos: {
                  label: "macOS",
                  badge: "Terminal Admin",
                  steps: [
                    {
                      title: "Télécharger l'agent (.pkg)",
                      comment: "# Étape 1 — Téléchargement du paquet macOS",
                      cmd: `curl -so /tmp/wazuh-agent.pkg https://packages.wazuh.com/4.x/macos/wazuh-agent-4.14.5-1.intel64.pkg`,
                    },
                    {
                      title: "Installer & enregistrer l'agent",
                      comment: "# Étape 2 — Installation avec mot de passe d'enrollment",
                      cmd: `WAZUH_MANAGER="${cloudManager}"${pwdParamLinux} WAZUH_AGENT_GROUP="${groupName}" installer -pkg /tmp/wazuh-agent.pkg -target /`,
                    },
                    {
                      title: "Démarrer l'agent",
                      comment: "# Étape 3 — Démarrage du service Wazuh",
                      cmd: `/Library/Ossec/bin/wazuh-control start`,
                    },
                  ],
                },
              };

              const activeOs = edrDeployOs;
              const activeScript = osScripts[activeOs];

              const osIcons: Record<string, React.ReactNode> = {
                windows: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
                ),
                linux: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587.026 1.row21-.274 1.666-.869.393-.56.458-1.419.458-2.178 0-.609.013-1.291.17-1.825.155-.54.427-.87.917-1.18.484-.308.947-.559 1.323-.896.765-.661 1.073-1.474.73-2.643-.343-1.169-1.37-2.216-2.09-3.338-.657-1.015-.998-2.064-1.095-3.232-.097-1.168.024-2.515.464-4.043.131-.484.191-.938.191-1.36C15.7 1.062 14.137 0 12.504 0zM9.304 7.742c.03-.013.085-.027.154-.027.207 0 .49.09.573.306a.42.42 0 01-.017.354c-.084.161-.261.27-.46.27a.43.43 0 01-.413-.43c0-.242.143-.434.163-.473zm5.358 0c.02.039.163.231.163.473a.43.43 0 01-.413.43c-.199 0-.376-.109-.46-.27a.42.42 0 01-.017-.354c.083-.216.366-.306.573-.306.069 0 .124.014.154.027zm-5.75 2.786c.37 0 .67.3.67.67s-.3.67-.67.67-.67-.3-.67-.67.3-.67.67-.67zm6.142 0c.37 0 .67.3.67.67s-.3.67-.67.67-.67-.3-.67-.67.3-.67.67-.67z"/></svg>
                ),
                macos: (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>
                ),
              };

              const tierGradients: Record<string, string> = {
                Bronze:  "from-orange-950/80 via-slate-950 to-slate-950",
                Argent:  "from-blue-950/80 via-slate-950 to-slate-950",
                Or:      "from-amber-950/80 via-slate-950 to-slate-950",
                Platine: "from-violet-950/80 via-slate-950 to-slate-950",
              };
              const tierAccent: Record<string, string> = {
                Bronze:  "text-orange-400 border-orange-500/30 bg-orange-500/10",
                Argent:  "text-blue-400 border-blue-500/30 bg-blue-500/10",
                Or:      "text-amber-400 border-amber-500/30 bg-amber-500/10",
                Platine: "text-violet-400 border-violet-500/30 bg-violet-500/10",
              };
              const tierBorder: Record<string, string> = {
                Bronze:  "border-orange-500/20",
                Argent:  "border-blue-500/20",
                Or:      "border-amber-500/20",
                Platine: "border-violet-500/20",
              };
              const tier = extData.contractTier as string;
              const accentCls = tierAccent[tier] ?? tierAccent.Bronze;
              const borderCls = tierBorder[tier] ?? tierBorder.Bronze;
              const gradientCls = tierGradients[tier] ?? tierGradients.Bronze;

              const steps = [
                { num: 1, done: true,           icon: User,     label: "Client créé",        sub: form.organization || "Client" },
                { num: 2, done: usedPcs > 0,    icon: Monitor,  label: "Machines ajoutées",  sub: `${usedPcs} / ${maxPcs}` },
                { num: 3, done: agentInstalled,  icon: Download, label: "Agent déployé",      sub: "Wazuh 4.14.5" },
                { num: 4, done: allConnected && usedPcs > 0, icon: Activity, label: "Supervision active", sub: "SOC temps réel" },
              ];

              return (
                <div className="space-y-2">
                  {/* ── Collapsible toggle ── */}
                  <button
                    onClick={() => setDeployGuideOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900/90 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg border ${accentCls} flex items-center justify-center`}>
                        <Download className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Guide de déploiement EDR</p>
                        <p className="text-[11px] text-zinc-500">{usedPcs}/{maxPcs} agents · Wazuh Cloud v4.14.5 · Groupe : <span className="text-zinc-300 font-mono">{groupName}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {allConnected && usedPcs > 0 ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Tous actifs
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Action requise
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${deployGuideOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {deployGuideOpen && (
                  <div className={`rounded-2xl border ${borderCls} bg-gradient-to-br ${gradientCls} overflow-hidden shadow-2xl`}>

                  {/* ── HERO BANNER ── */}
                  <div className="relative px-6 pt-6 pb-5 border-b border-white/5">
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl border ${accentCls} flex items-center justify-center shadow-lg`}>
                          <Shield className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${accentCls}`}>
                              {offerInfo.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">Wazuh Cloud v4.14.5</span>
                          </div>
                          <h2 className="text-lg font-black text-white tracking-tight">
                            Guide de déploiement EDR
                          </h2>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {form.organization || "Client"} · Groupe :
                            <code className={`ml-1.5 font-mono text-[11px] px-2 py-0.5 rounded-md border ${accentCls}`}>{groupName}</code>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right space-y-2">
                        {allConnected && usedPcs > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Toutes les machines actives
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                            Déploiement en cours
                          </span>
                        )}
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${quotaPct >= 90 ? "bg-rose-500" : quotaPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(quotaPct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-black ${usedPcs >= maxPcs ? "text-rose-400" : "text-zinc-300"}`}>
                            {usedPcs}/{maxPcs}
                          </span>
                          <span className="text-[10px] text-zinc-500">machines</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline progress */}
                    <div className="relative mt-6 flex items-center gap-0">
                      {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isLast = idx === steps.length - 1;
                        return (
                          <div key={step.num} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1.5 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                                step.done
                                  ? `${accentCls} shadow-lg`
                                  : "border-white/10 bg-white/5 text-zinc-600"
                              }`}>
                                {step.done
                                  ? <CheckCircle2 className="h-4 w-4" />
                                  : <Icon className="h-4 w-4" />
                                }
                              </div>
                              <div className="text-center">
                                <p className={`text-[10px] font-black uppercase tracking-widest ${step.done ? "text-white" : "text-zinc-600"}`}>
                                  {step.label}
                                </p>
                                <p className={`text-[9px] mt-0.5 ${step.done ? "text-zinc-400" : "text-zinc-700"}`}>{step.sub}</p>
                              </div>
                            </div>
                            {!isLast && (
                              <div className={`flex-1 h-px mx-2 mb-5 transition-all ${steps[idx + 1].done ? "bg-gradient-to-r from-current to-current opacity-40" : "bg-white/8"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── SCRIPTS SECTION ── */}
                  <div className="p-6 space-y-4">

                    {/* Mot de passe d'enrollment */}
                    <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-rose-400" />
                        <span className="text-[11px] font-black text-rose-300">Mot de passe d'enrollment Wazuh Cloud</span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono">Requis</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Allez sur <strong className="text-zinc-300">console.cloud.wazuh.com → Deploy new agent → Windows</strong> — copiez la valeur <code className="font-mono text-rose-300 bg-rose-900/30 px-1 rounded">WAZUH_REGISTRATION_PASSWORD</code> dans la commande générée.
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Collez votre mot de passe d'enrollment ici..."
                          value={wazuhPassword}
                          onChange={e => setWazuhPassword(e.target.value)}
                          className="flex-1 h-8 text-xs font-mono bg-black/40 border border-rose-500/20 rounded-lg px-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                        />
                        {wazuhPassword && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            <Check className="h-3 w-3" /> Défini
                          </span>
                        )}
                      </div>
                    </div>

                    {/* OS Selector Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/5 w-fit">
                      {(["windows", "linux", "macos"] as const).map((os) => (
                        <button
                          key={os}
                          onClick={() => setEdrDeployOs(os)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                            activeOs === os
                              ? `${accentCls} shadow-md`
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          <span className={activeOs === os ? "" : "opacity-40"}>{osIcons[os]}</span>
                          {osScripts[os].label}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${activeOs === os ? "bg-black/20" : "bg-white/5 text-zinc-600"}`}>
                            {osScripts[os].badge}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Copy all button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="text-[11px] text-zinc-500">
                          3 commandes — <span className="text-zinc-300 font-semibold">{activeScript.badge}</span>
                        </span>
                      </div>
                      <button
                        className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all"
                        onClick={() => {
                          const all = activeScript.steps.map(s => `${s.comment}\n${s.cmd}`).join("\n\n");
                          navigator.clipboard.writeText(all);
                          toast.success(`Script ${activeScript.label} complet copié`, {
                            description: "Collez dans un terminal administrateur et exécutez séquentiellement."
                          });
                        }}
                      >
                        <Copy className="h-3 w-3" /> Copier tout le script
                      </button>
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {activeScript.steps.map((step, i) => (
                        <div key={i} className="rounded-xl border border-white/6 bg-black/40 overflow-hidden">
                          {/* Step header */}
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${accentCls}`}>
                                {i + 1}
                              </span>
                              <span className="text-xs font-bold text-zinc-200">{step.title}</span>
                            </div>
                            <button
                              className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
                              onClick={() => {
                                navigator.clipboard.writeText(step.cmd);
                                setCopiedScript(`${activeOs}-${i}`);
                                setTimeout(() => setCopiedScript(null), 2000);
                                toast.success(`Étape ${i + 1} copiée`);
                              }}
                            >
                              {copiedScript === `${activeOs}-${i}`
                                ? <><Check className="h-3 w-3 text-emerald-400" /> Copié</>
                                : <><Copy className="h-3 w-3" /> Copier</>
                              }
                            </button>
                          </div>
                          {/* Comment line */}
                          <div className="px-4 pt-2.5 pb-1">
                            <span className="text-[10px] font-mono text-zinc-600">{step.comment}</span>
                          </div>
                          {/* Command */}
                          <div className="px-4 pb-3">
                            <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                              {step.cmd}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Script tout-en-un Windows */}
                    {activeOs === "windows" && (
                      <div className={`rounded-xl border overflow-hidden ${wazuhPassword ? "border-emerald-500/20 bg-emerald-950/20" : "border-zinc-500/20 bg-zinc-900/30"}`}>
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
                          <div className="flex items-center gap-2">
                            <Zap className={`h-3.5 w-3.5 ${wazuhPassword ? "text-emerald-400" : "text-zinc-500"}`} />
                            <span className={`text-[11px] font-black ${wazuhPassword ? "text-emerald-300" : "text-zinc-400"}`}>Script tout-en-un</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 font-mono">PowerShell Admin</span>
                            {!wazuhPassword && <span className="text-[9px] text-amber-400 font-bold">← Entrez le mot de passe ci-dessus</span>}
                          </div>
                          <button
                            disabled={!wazuhPassword}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${wazuhPassword ? "text-emerald-400 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20" : "text-zinc-600 bg-white/5 border-white/5 cursor-not-allowed"}`}
                            onClick={() => {
                              if (!wazuhPassword) return;
                              const script = [
                                `# INOVA-IRIS - Installation Wazuh Agent pour ${form.organization || groupName}`,
                                `$EP="${cloudManager}"; $GRP="${groupName}"; $PWD="${wazuhPassword}"; $MSI="$env:TEMP\\wazuh.msi"`,
                                `NET STOP WazuhSvc 2>$null; Start-Sleep 1`,
                                `Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi" -OutFile $MSI -UseBasicParsing`,
                                `msiexec /i $MSI WAZUH_MANAGER="$EP" WAZUH_REGISTRATION_SERVER="$EP" WAZUH_REGISTRATION_PASSWORD="$PWD" WAZUH_AGENT_GROUP="$GRP" /q`,
                                `Clear-Content "C:\\Program Files (x86)\\ossec-agent\\client.keys" -ErrorAction SilentlyContinue`,
                                `Start-Sleep 3; NET START WazuhSvc`,
                                `Write-Host "Agent demarre !" -ForegroundColor Green`,
                              ].join("\n");
                              navigator.clipboard.writeText(script);
                              toast.success("Script complet copié !", {
                                description: "Collez et exécutez dans PowerShell Administrateur."
                              });
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copier le script complet
                          </button>
                        </div>
                        <div className="px-4 py-3">
                          <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap">
                            <span className="text-zinc-600">{`$EP="${cloudManager}"; $GRP="${groupName}"; $PWD="`}</span>
                            <span className={wazuhPassword ? "text-rose-300" : "text-zinc-600"}>{wazuhPassword || "MOT_DE_PASSE_ICI"}</span>
                            <span className="text-zinc-600">{`"; $MSI="$env:TEMP\\wazuh.msi"\n`}</span>
                            <span className="text-emerald-300/70">{`NET STOP WazuhSvc 2>$null; Start-Sleep 1\n`}</span>
                            <span className="text-emerald-300/70">{`Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.5-1.msi" -OutFile $MSI -UseBasicParsing\n`}</span>
                            <span className="text-emerald-300/70">{`msiexec /i $MSI WAZUH_MANAGER="$EP" WAZUH_REGISTRATION_SERVER="$EP" WAZUH_REGISTRATION_PASSWORD="$PWD" WAZUH_AGENT_GROUP="$GRP" /q\n`}</span>
                            <span className="text-emerald-300/70">{`Clear-Content "C:\\Program Files (x86)\\ossec-agent\\client.keys" -ErrorAction SilentlyContinue\n`}</span>
                            <span className="text-emerald-300/70">{`Start-Sleep 3; NET START WazuhSvc`}</span>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Footer info */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-3 rounded-xl bg-blue-950/30 border border-blue-500/10 p-3">
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="h-3 w-3 text-blue-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-blue-200">Vérifier la connexion</p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            L'agent apparaît dans la topologie (point vert) sous 30 secondes. Filtrez par groupe
                            <code className="mx-1 font-mono text-[9px] px-1 py-0.5 rounded bg-blue-900/40 text-blue-300">{groupName}</code>
                            dans Wazuh Cloud.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-xl bg-amber-950/20 border border-amber-500/10 p-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Network className="h-3 w-3 text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-amber-200">Ports requis (sortant)</p>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">
                            TCP <code className="font-mono text-amber-300">1514</code> (événements agent) ·
                            TCP <code className="font-mono text-amber-300">1515</code> (enrollment) ·
                            TCP <code className="font-mono text-amber-300">443</code> (API Cloud)
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
                  )}
                </div>
              );
            })()}

            {/* Topologie et Flux de Logs Temps Réel (Grid 2 Colonnes) */}
            <div className="grid gap-6 md:grid-cols-3">
              
              {/* ── CARTE TOPOLOGIE REDESIGNÉE (thème clair) ── */}
              <div className="md:col-span-2 rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_2px_24px_0_rgba(0,0,0,0.06)] flex flex-col relative" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #f1f5f9 100%)" }}>

                {/* Barre dégradée top */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-300 z-10" />

                {/* Header topologie */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 border border-orange-200/60 flex items-center justify-center shadow-sm">
                      <Network className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 tracking-wide">Topologie de Protection Endpoint</p>
                      <p className="text-[10px] text-slate-400">Cartographie des agents Wazuh en temps réel</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-600 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SOC HUB · 10.0.0.1
                    </span>
                  </div>
                </div>

                {/* SVG zone */}
                <div className="flex-1 relative px-4 pt-2 pb-3">
                  {(() => {
                    const offerInfo = OFFER_BY_TIER[extData.contractTier] ?? OFFER_BY_TIER.Bronze;
                    const maxPcs = offerInfo.maxPcs;
                    const usedPcs = extData.pcs.length;
                    const quotaReached = usedPcs >= maxPcs;

                    const addMachine = () => {
                      if (quotaReached) {
                        toast.error(`Quota atteint (${maxPcs} PC max — ${offerInfo.name})`, {
                          description: "Mettez à niveau votre offre pour ajouter plus de machines."
                        });
                        return;
                      }
                      setAddMachineOpen(true);
                    };

                    return (
                      <div className="w-full flex flex-col gap-3">
                        {/* Quota bar redesignée (thème clair) */}
                        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border border-slate-200/80 bg-white/70 shadow-sm">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full" style={{ background: offerInfo.color }} />
                                {offerInfo.name}
                              </span>
                              <span className={`text-[11px] font-black ${quotaReached ? "text-rose-500" : "text-emerald-600"}`}>
                                {usedPcs} / {maxPcs} postes
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.min((usedPcs / maxPcs) * 100, 100)}%`,
                                  background: quotaReached ? "#ef4444" : usedPcs / maxPcs > 0.8 ? "#f59e0b" : offerInfo.color,
                                }}
                              />
                            </div>
                          </div>
                          <button onClick={addMachine} disabled={quotaReached}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                              quotaReached
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 hover:scale-105"
                            }`}>
                            <Plus className="h-3 w-3" />
                            {quotaReached ? "Quota max" : "Ajouter"}
                          </button>
                        </div>

                        {/* SVG topology */}
                        <svg className="w-full" viewBox="0 0 580 280" style={{ minHeight: 220 }}>
                          <defs>
                            {/* Gradient pour lignes actives */}
                            <linearGradient id="lineGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8"/>
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8"/>
                            </linearGradient>
                            <linearGradient id="lineGradAlert" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8"/>
                              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8"/>
                            </linearGradient>
                            {/* Glow filters */}
                            <filter id="glow-hub" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="6" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="glow-node" x="-30%" y="-30%" width="160%" height="160%">
                              <feGaussianBlur stdDeviation="3" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="glow-red" x="-30%" y="-30%" width="160%" height="160%">
                              <feGaussianBlur stdDeviation="3" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            {/* Hub glow radial */}
                            <radialGradient id="hubBg" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.18"/>
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0"/>
                            </radialGradient>
                            {/* Background grid (clair) */}
                            <pattern id="bgGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#475569" strokeWidth="0.4" opacity="0.06"/>
                            </pattern>
                          </defs>

                          {/* Background */}
                          <rect width="580" height="280" fill="url(#bgGrid)" />

                          {/* Rings around hub */}
                          {[52, 70, 90].map((r, i) => (
                            <circle key={r} cx="290" cy="140" r={r}
                              fill="none" stroke="#f97316"
                              strokeWidth={i === 0 ? 0.8 : 0.5}
                              strokeDasharray={i === 2 ? "4,8" : ""}
                              opacity={0.22 - i * 0.05} />
                          ))}

                          {/* Connection lines */}
                          {extData.pcs.map((pc, idx) => {
                            const telemetry = pcTelemetry[pc.id];
                            const status = telemetry?.wazuhStatus || pc.status;
                            const total = extData.pcs.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const rx = 200, ry = 95;
                            const tx = 290 + rx * Math.cos(angle);
                            const ty = 140 + ry * Math.sin(angle);
                            const strokeColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#cbd5e1";
                            const dash = status === "isolated" ? "6,4" : status === "disconnected" ? "3,6" : "";
                            const gradId = status === "active" ? "url(#lineGradActive)" : status === "alert" ? "url(#lineGradAlert)" : strokeColor;
                            return (
                              <g key={`ln-${pc.id}`}>
                                {/* Glow line */}
                                <line x1="290" y1="140" x2={tx} y2={ty}
                                  stroke={strokeColor} strokeWidth="3" strokeDasharray={dash} opacity="0.08" />
                                {/* Main line */}
                                <line x1="290" y1="140" x2={tx} y2={ty}
                                  stroke={status === "active" || status === "alert" ? gradId : strokeColor}
                                  strokeWidth="1.5" strokeDasharray={dash} opacity={status === "disconnected" ? 0.25 : 0.7} />
                                {/* Animated particle */}
                                {(status === "active" || status === "alert") && (
                                  <circle r="2.5" fill={strokeColor} opacity="0.9">
                                    <animateMotion dur={`${2 + idx * 0.4}s`} repeatCount="indefinite"
                                      path={`M290,140 L${tx},${ty}`} />
                                  </circle>
                                )}
                              </g>
                            );
                          })}

                          {/* ── SOC HUB redessiné ── */}
                          <g className="cursor-pointer" onClick={() => setSelectedPcId(null)}>
                            {/* Glow halo */}
                            <circle cx="290" cy="140" r="44" fill="url(#hubBg)" />
                            {/* Outer ring */}
                            <circle cx="290" cy="140" r="34" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.4">
                              <animateTransform attributeName="transform" type="rotate"
                                from="0 290 140" to="360 290 140" dur="12s" repeatCount="indefinite"/>
                              <animate attributeName="stroke-dasharray" values="8,4;4,8;8,4" dur="3s" repeatCount="indefinite"/>
                            </circle>
                            {/* Body */}
                            <rect x="274" y="122" width="32" height="36" rx="5" fill="#ffffff" stroke="#f97316" strokeWidth="1.8" filter="url(#glow-hub)" />
                            {/* Server slots */}
                            {[0,1,2].map(i => (
                              <g key={i}>
                                <rect x="278" y={126 + i * 10} width="24" height="7" rx="2" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="0.5" />
                                <circle cx="282" cy={129.5 + i * 10} r="2" fill={i < 2 ? "#10b981" : "#f59e0b"} filter="url(#glow-node)" />
                                <rect x="286" y={128 + i * 10} width="12" height="2" rx="1" fill="#cbd5e1" />
                                <rect x="286" y={131 + i * 10} width="8" height="1.5" rx="1" fill="#e2e8f0" />
                              </g>
                            ))}
                            {/* Pulse */}
                            <circle cx="290" cy="163" r="5" fill="#f97316" opacity="0.15">
                              <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="0.15;0;0.15" dur="2s" repeatCount="indefinite"/>
                            </circle>
                            <circle cx="290" cy="163" r="2.5" fill="#f97316" />
                            <text x="290" y="178" textAnchor="middle" fontSize="7" fontWeight="900"
                              fill="#ea580c" letterSpacing="1.5">SOC MANAGER</text>
                            <text x="290" y="187" textAnchor="middle" fontSize="6" fill="#94a3b8" letterSpacing="0.5">INOVA IRIS</text>
                          </g>

                          {/* ── ENDPOINT NODES redessinés ── */}
                          {extData.pcs.map((pc, idx) => {
                            const telemetry = pcTelemetry[pc.id];
                            const status = telemetry?.wazuhStatus || pc.status;
                            const isSelected = selectedPcId === pc.id;
                            const total = extData.pcs.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const rx = 200, ry = 95;
                            const cx = 290 + rx * Math.cos(angle);
                            const cy = 140 + ry * Math.sin(angle);

                            const borderColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#94a3b8";
                            const bgColor = status === "active" ? "#ecfdf5" : status === "alert" ? "#fffbeb" : status === "isolated" ? "#fef2f2" : "#f8fafc";
                            const dotColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#94a3b8";
                            const osChar = pc.os === "windows" ? "W" : pc.os === "linux" ? "L" : "M";
                            const shortName = pc.name.length > 12 ? `${pc.name.slice(0, 9)}…` : pc.name;

                            return (
                              <g key={`node-${pc.id}`} className="cursor-pointer"
                                onClick={() => setSelectedPcId(pc.id)}>
                                {/* Selection halo */}
                                {isSelected && (
                                  <circle cx={cx} cy={cy} r="24" fill="none" stroke="#f97316"
                                    strokeWidth="1.5" strokeDasharray="3,3" opacity="0.8">
                                    <animateTransform attributeName="transform" type="rotate"
                                      from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="4s" repeatCount="indefinite"/>
                                  </circle>
                                )}
                                {/* Glow */}
                                {status !== "disconnected" && (
                                  <circle cx={cx} cy={cy} r="18" fill={borderColor} opacity="0.08" filter="url(#glow-node)" />
                                )}
                                {/* Laptop body */}
                                <rect x={cx - 14} y={cy - 12} width="28" height="18" rx="3"
                                  fill={bgColor} stroke={borderColor} strokeWidth={isSelected ? 2 : 1.5} />
                                {/* Screen inner */}
                                <rect x={cx - 12} y={cy - 10} width="24" height="13" rx="1.5" fill={bgColor} opacity="0.9" />
                                {/* OS char on screen */}
                                <text x={cx} y={cy - 2} textAnchor="middle" fontSize="7" fontWeight="900"
                                  fill={borderColor} fontFamily="monospace">{osChar}</text>
                                {/* Base */}
                                <rect x={cx - 16} y={cy + 6} width="32" height="4" rx="1.5"
                                  fill="#e2e8f0" stroke={borderColor} strokeWidth="1" />
                                <rect x={cx - 5} y={cy + 9} width="10" height="1.5" rx="1" fill="#cbd5e1" />
                                {/* Status dot */}
                                <circle cx={cx + 12} cy={cy - 11} r="3.5" fill={dotColor} filter={status !== "disconnected" ? "url(#glow-node)" : ""}>
                                  {(status === "active" || status === "alert") && (
                                    <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
                                  )}
                                </circle>
                                {/* Name label */}
                                <text x={cx} y={cy + 20} textAnchor="middle" fontSize="7" fontWeight="700"
                                  fontFamily="monospace" fill={isSelected ? "#ea580c" : "#475569"}>
                                  {shortName}
                                </text>
                                {/* IP label */}
                                <text x={cx} y={cy + 28} textAnchor="middle" fontSize="6"
                                  fontFamily="monospace" fill="#94a3b8">
                                  {pc.ip}
                                </text>
                              </g>
                            );
                          })}
                        </svg>

                        {/* Légende */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex gap-4">
                            {[
                              { color: "#10b981", label: "En ligne" },
                              { color: "#f59e0b", label: "Alerte SOC", pulse: true },
                              { color: "#ef4444", label: "Quarantaine" },
                              { color: "#cbd5e1", label: "Hors ligne" },
                            ].map(s => (
                              <span key={s.label} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <span className={`h-2 w-2 rounded-full ${s.pulse ? "animate-pulse" : ""}`} style={{ background: s.color }} />
                                {s.label}
                              </span>
                            ))}
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">TLS v1.3 · AES-256-GCM</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Flux de logs en temps réel (1/3 de large sur desktop) */}
              <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm p-4 relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                <div className="pb-2 border-b border-border/30">
                  <h3 className="text-md font-bold flex items-center gap-2 text-foreground">
                    <Activity className="h-4.5 w-4.5 text-primary animate-pulse" /> Flux des Menaces Temps Réel
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Agrégation en continu des signaux EDR & CTI</p>
                </div>

                {/* Console Log Flowing Area */}
                <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2.5 my-3 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800 max-h-[250px] leading-relaxed">
                  {logsStream.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground/60 italic text-center">
                      En attente de paquets de télémétrie...
                    </div>
                  ) : (
                    logsStream.map((log) => {
                      let tagColor = "bg-primary/10 text-primary border-primary/20";
                      let messageColor = "text-slate-300";
                      
                      if (log.source === "VirusTotal") tagColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                      else if (log.source === "MISP") tagColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                      else if (log.source === "SOAR") tagColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                      else if (log.source === "TheHive") {
                        tagColor = "bg-red-500/10 text-red-400 border-red-500/20";
                        messageColor = "text-rose-300 font-bold";
                      } else if (log.source === "DFIR-IRIS") tagColor = "bg-teal-500/10 text-teal-400 border-teal-500/20";

                      return (
                        <div key={log.id} className="border-b border-border/10 pb-1.5 flex flex-col gap-0.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span className="font-semibold text-primary/80">{log.time} · {log.pcName}</span>
                            <Badge variant="outline" className={`text-[8px] font-bold px-1 py-0 border rounded ${tagColor}`}>
                              {log.source}
                            </Badge>
                          </div>
                          <p className={`mt-0.5 ${messageColor}`}>{log.message}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-border/30 pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-semibold">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
                    {logsStream.length} événements capturés
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-[10px] text-muted-foreground hover:text-foreground rounded-lg"
                    onClick={() => setLogsStream([])}
                  >
                    Effacer flux
                  </Button>
                </div>
              </Card>

            </div>

            {/* Tableau principal des PC Connectés */}
            <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-primary" />
                      Console de terminaux EDR connectés ({extData.pcs.length})
                    </CardTitle>
                    <CardDescription>Pilotez à distance la protection active des postes clients et exécutez des playbooks SOAR.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedPcId && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-lg text-xs"
                        onClick={() => setSelectedPcId(null)}
                      >
                        Désélectionner PC
                      </Button>
                    )}
                  </div>
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
                        <th className="px-5 py-3.5">Flux Réseau (Temps réel)</th>
                        <th className="px-5 py-3.5">Télémétrie CPU/RAM</th>
                        <th className="px-5 py-3.5">État Wazuh</th>
                        <th className="px-5 py-3.5 text-right">Action Directe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {extData.pcs.map((pc) => {
                        const isSelected = selectedPcId === pc.id;
                        const telemetry = pcTelemetry[pc.id] || {
                          cpu: pc.cpu,
                          ram: pc.ram,
                          rxSpeed: 0,
                          txSpeed: 0,
                          procCount: 0,
                          packetsTotal: 0,
                          wazuhStatus: pc.status
                        };

                        const status = telemetry.wazuhStatus;

                        return (
                          <tr 
                            key={pc.id} 
                            className={`hover:bg-muted/30 transition-all cursor-pointer ${isSelected ? "bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary" : ""} ${status === "isolated" ? "bg-red-500/5" : ""}`}
                            onClick={() => setSelectedPcId(pc.id)}
                          >
                            {/* Terminal Name */}
                            <td className="px-5 py-4 font-semibold text-foreground flex flex-col">
                              <span className="flex items-center gap-1.5">
                                {pc.name}
                                {status === "isolated" && (
                                  <Badge className="bg-rose-500 text-white font-extrabold border-none text-[9px] rounded-md px-1.5 py-0.5 gap-0.5 animate-pulse">
                                    <ShieldAlert className="h-3 w-3" /> ISOLÉ
                                  </Badge>
                                )}
                                {status === "alert" && (
                                  <Badge className="bg-amber-500 text-slate-950 font-extrabold border-none text-[9px] rounded-md px-1.5 py-0.5 gap-0.5 animate-bounce">
                                    <AlertTriangle className="h-3 w-3" /> ALERTE
                                  </Badge>
                                )}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">WZ-ID: {pc.wazuhId} · Processus: {telemetry.procCount || "—"}</span>
                            </td>

                            {/* OS Type */}
                            <td className="px-5 py-4 capitalize font-medium">
                              <span className="flex items-center gap-1.5">
                                {pc.os === "windows" ? "🖥️ Windows" : pc.os === "linux" ? "🐧 Linux" : "🍎 macOS"}
                              </span>
                            </td>

                            {/* IP */}
                            <td className="px-5 py-4 font-mono text-xs">{pc.ip}</td>

                            {/* Live Bandwidth */}
                            <td className="px-5 py-4 font-mono text-xs">
                              {status === "active" || status === "alert" ? (
                                <div className="flex flex-col gap-0.5 text-emerald-500 dark:text-emerald-400 font-semibold">
                                  <span className="flex items-center gap-1">↓ {telemetry.rxSpeed} KB/s</span>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">↑ {telemetry.txSpeed} KB/s · PKTS: {telemetry.packetsTotal}</span>
                                </div>
                              ) : status === "isolated" ? (
                                <span className="text-rose-500 font-bold flex items-center gap-1">🚫 LOCKDOWN</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>

                            {/* Telemetry cpu / ram */}
                            <td className="px-5 py-4">
                              {status !== "disconnected" ? (
                                <div className="space-y-1.5 w-32">
                                  <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                                    <span className={telemetry.cpu > 75 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-400"}>CPU: {telemetry.cpu}%</span>
                                    <span className={telemetry.ram > 80 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-400"}>RAM: {telemetry.ram}%</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${telemetry.cpu > 75 ? "bg-rose-500 animate-pulse" : "bg-primary"}`} 
                                      style={{ width: `${Math.max(telemetry.cpu, telemetry.ram)}%` }} 
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>

                            {/* Connection Status */}
                            <td className="px-5 py-4">
                              {status === "active" ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 font-bold border-none rounded-lg px-2 py-0.5">En Ligne</Badge>
                              ) : status === "alert" ? (
                                <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 font-bold border-none rounded-lg px-2 py-0.5 animate-pulse">Alerte SOC</Badge>
                              ) : status === "isolated" ? (
                                <Badge className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/10 font-bold border-none rounded-lg px-2 py-0.5">Quarantaine</Badge>
                              ) : (
                                <Badge className="bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-400 font-medium border-none rounded-lg px-2 py-0.5">Déconnecté</Badge>
                              )}
                            </td>

                            {/* Quick Actions */}
                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              {status === "disconnected" ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  {status === "isolated" ? (
                                    <Button 
                                      variant="default" 
                                      size="sm"
                                      className="h-8 rounded-lg text-xs font-semibold px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => {
                                        setPcTelemetry(prev => ({
                                          ...prev,
                                          [pc.id]: { ...prev[pc.id], wazuhStatus: "active" }
                                        }));
                                        if (extData) {
                                          const updatedPcs = extData.pcs.map(p => {
                                            if (p.id === pc.id) return { ...p, status: "active" as const };
                                            return p;
                                          });
                                          const updatedExt = { ...extData, pcs: updatedPcs };
                                          setExtData(updatedExt);
                                          localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updatedExt));
                                        }
                                        toast.success("Terminal reconnecté", {
                                          description: `L'accès réseau a été entièrement rétabli pour ${pc.name}.`
                                        });
                                        addGlobalLog(pc.name, "SOAR", "info", "Endpoint reconnecté au réseau. Quarantaine désactivée.");
                                      }}
                                    >
                                      Reconnecter
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      className="h-8 rounded-lg text-xs font-semibold px-2.5"
                                      onClick={() => triggerSoarPlaybook("ransomware", pc)}
                                      disabled={activePlaybook !== null}
                                    >
                                      Isoler EDR
                                    </Button>
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

            {/* Panneau de détails EDR & Technologie (S'affiche si un PC est sélectionné) */}
            {selectedPcId && extData.pcs.find(pc => pc.id === selectedPcId) && (() => {
              const pc = extData.pcs.find(p => p.id === selectedPcId)!;
              const telemetry = pcTelemetry[pc.id] || {
                cpu: pc.cpu,
                ram: pc.ram,
                rxSpeed: 0,
                txSpeed: 0,
                procCount: 0,
                socketsCount: 0,
                packetsTotal: 0,
                wazuhStatus: pc.status
              };

              return (
                <div className="grid gap-6 md:grid-cols-2 animate-fadeIn border-t border-border/40 pt-6">
                  
                  {/* Colonne de Gauche : Console Terminal Shell Remote */}
                  <Card className="shadow-lg border-border/50 bg-slate-950 dark:bg-black text-slate-100 rounded-xl overflow-hidden flex flex-col justify-between min-h-[380px] p-0 font-mono">
                    <CardHeader className="bg-slate-900 border-b border-slate-800 py-3 px-4 flex flex-row justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4.5 w-4.5 text-primary animate-pulse" />
                        <span className="text-xs font-bold text-slate-200">EDR Shell Terminal : {pc.name}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[9px] text-primary border-primary/20 bg-primary/5 rounded px-1.5">
                        WZ-AGENT v4.14.5
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="flex-1 p-4 overflow-y-auto text-xs space-y-2 max-h-[250px] scrollbar-thin scrollbar-thumb-slate-800">
                      {terminalHistory.map((line, idx) => {
                        let lineStyle = "text-slate-300";
                        if (line.type === "input") lineStyle = "text-sky-400 font-bold";
                        else if (line.type === "error") lineStyle = "text-rose-500 font-bold";
                        else if (line.type === "system") lineStyle = "text-emerald-400/90 font-bold border-b border-slate-800/50 pb-1";

                        return (
                          <pre key={idx} className={`whitespace-pre-wrap ${lineStyle}`}>
                            {line.text}
                          </pre>
                        );
                      })}
                    </CardContent>

                    {/* Quick Command Shortcuts bar */}
                    <div className="bg-slate-900/60 border-t border-slate-800/80 px-3 py-2 flex flex-wrap gap-1.5 text-[9px] text-slate-400 items-center">
                      <span className="font-bold mr-1">Raccourcis :</span>
                      <button 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-all"
                        onClick={() => executeTerminalCommand("wazuh status")}
                      >
                        wazuh status
                      </button>
                      <button 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-all"
                        onClick={() => executeTerminalCommand("syscheck --verify")}
                      >
                        syscheck --verify
                      </button>
                      <button 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-all"
                        onClick={() => executeTerminalCommand("vt-scan --running")}
                      >
                        vt-scan --running
                      </button>
                      <button 
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-all"
                        onClick={() => executeTerminalCommand("misp-check --net")}
                      >
                        misp-check --net
                      </button>
                    </div>

                    {/* Console input form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        executeTerminalCommand(terminalInput);
                      }}
                      className="border-t border-slate-800/80 bg-slate-900 p-2 flex gap-2 items-center"
                    >
                      <span className="text-sky-400 font-bold pl-2 select-none">$</span>
                      <Input
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder="Tapez votre commande EDR..."
                        className="flex-1 bg-transparent border-none text-slate-100 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-8 pl-1 placeholder-slate-600"
                        autoComplete="off"
                        disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                      />
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="h-8 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-700 text-white"
                        disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                      >
                        Exécuter
                      </Button>
                    </form>
                  </Card>

                  {/* Colonne de Droite : Playbooks SOAR & HUD Technologies */}
                  <div className="space-y-6">
                    
                    {/* HUD Technologies Sync Status */}
                    <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm p-4">
                      <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                        <Settings className="h-4.5 w-4.5 text-primary" /> Matrice d'Intégration Technologie
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-2.5">
                        
                        {/* Wazuh */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">Wazuh EDR</span>
                          <Badge variant="outline" className={`text-[9px] font-bold mt-1.5 border-none px-2 rounded-full ${telemetry.wazuhStatus === "active" ? "bg-emerald-500/10 text-emerald-500" : telemetry.wazuhStatus === "isolated" ? "bg-rose-500/10 text-rose-500" : telemetry.wazuhStatus === "alert" ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-500"}`}>
                            ✓ {telemetry.wazuhStatus === "isolated" ? "Confiné" : "Connecté"}
                          </Badge>
                        </div>

                        {/* VirusTotal */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">VirusTotal</span>
                          <Badge variant="outline" className="text-[9px] font-bold mt-1.5 border-none bg-purple-500/10 text-purple-400 px-2 rounded-full font-mono">
                            ✓ Actif (VT API)
                          </Badge>
                        </div>

                        {/* MISP */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">MISP Threat Intel</span>
                          <Badge variant="outline" className="text-[9px] font-bold mt-1.5 border-none bg-blue-500/10 text-blue-400 px-2 rounded-full">
                            ✓ 1.4K Feeds
                          </Badge>
                        </div>

                        {/* Shuffle */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">Shuffle SOAR</span>
                          <Badge variant="outline" className={`text-[9px] font-bold mt-1.5 border-none px-2 rounded-full ${activePlaybook ? "bg-orange-500/15 text-orange-500 animate-pulse" : "bg-orange-500/10 text-orange-400"}`}>
                            {activePlaybook ? "Playbook..." : "✓ Prêt"}
                          </Badge>
                        </div>

                        {/* TheHive */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">TheHive Alerts</span>
                          <Badge variant="outline" className="text-[9px] font-bold mt-1.5 border-none bg-rose-500/10 text-rose-500 px-2 rounded-full">
                            ✓ Synced Case
                          </Badge>
                        </div>

                        {/* DFIR-IRIS */}
                        <div className="border border-border/40 rounded-xl p-2.5 text-center bg-slate-50/50 dark:bg-slate-900/30">
                          <span className="text-[10px] text-muted-foreground block font-bold">DFIR-IRIS</span>
                          <Badge variant="outline" className="text-[9px] font-bold mt-1.5 border-none bg-teal-500/10 text-teal-400 px-2 rounded-full">
                            ✓ Case Manager
                          </Badge>
                        </div>

                      </div>
                    </Card>

                    {/* Automation Center: Shuffle SOAR Playbooks */}
                    <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-sm p-4 relative overflow-hidden flex-1">
                      <div className="flex justify-between items-center border-b border-border/30 pb-2 mb-3">
                        <div>
                          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <Zap className="h-4.5 w-4.5 text-orange-500 animate-pulse" /> Centre d'Automatisation SOAR
                          </h3>
                          <p className="text-[10px] text-muted-foreground">Pilotez des réponses d'incident orchestrées complexes</p>
                        </div>
                      </div>

                      {activePlaybook ? (
                        // Stepper de playbook actif
                        <div className="space-y-4 animate-fadeIn">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-orange-500 uppercase tracking-wide">Playbook en cours...</span>
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold">Étape {playbookStep}/4</span>
                          </div>

                          {/* Stepper Graphic */}
                          <div className="flex justify-between items-center relative my-3 px-4">
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-border -translate-y-1/2 -z-10"></div>
                            <div 
                              className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 -z-10 transition-all duration-1000"
                              style={{ width: `${(Math.min(playbookStep, 4) - 1) * 33.3}%` }}
                            ></div>

                            {[1, 2, 3, 4].map((stepNum) => {
                              const isCompleted = playbookStep > stepNum || playbookStep === 5;
                              const isActive = playbookStep === stepNum;
                              
                              return (
                                <div 
                                  key={stepNum} 
                                  className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${isCompleted ? "bg-emerald-600 border-emerald-500 text-white" : isActive ? "bg-slate-900 border-primary text-primary animate-pulse" : "bg-card border-border text-muted-foreground"}`}
                                >
                                  {isCompleted ? "✓" : stepNum}
                                </div>
                              );
                            })}
                          </div>

                          {/* Playbook logs panel */}
                          <div className="border border-border/40 bg-slate-950 p-3 rounded-xl font-mono text-[9px] text-slate-300 space-y-1 max-h-[100px] overflow-y-auto leading-relaxed shadow-inner">
                            {playbookLogs.map((logLine, logIdx) => (
                              <div key={logIdx} className="text-emerald-400">
                                {logLine}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // Boutons de déclenchement des playbooks
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            
                            <Button 
                              variant="outline"
                              className="justify-start text-left text-xs font-semibold py-4 border-rose-500/20 hover:bg-rose-500/5 text-rose-500 rounded-xl"
                              onClick={() => triggerSoarPlaybook("ransomware", pc)}
                              disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                            >
                              <ShieldAlert className="h-4 w-4 mr-2" />
                              Isoler & Contenir (Ransomware)
                            </Button>

                            <Button 
                              variant="outline"
                              className="justify-start text-left text-xs font-semibold py-4 border-purple-500/20 hover:bg-purple-500/5 text-purple-400 rounded-xl"
                              onClick={() => triggerSoarPlaybook("vt-audit", pc)}
                              disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                            >
                              <FolderSync className="h-4 w-4 mr-2" />
                              Scan Réputation complet (VT)
                            </Button>

                            <Button 
                              variant="outline"
                              className="justify-start text-left text-xs font-semibold py-4 border-amber-500/20 hover:bg-amber-500/5 text-amber-500 rounded-xl"
                              onClick={() => triggerSoarPlaybook("lockdown", pc)}
                              disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                            >
                              <Lock className="h-4 w-4 mr-2" />
                              Verrouiller les ports distants
                            </Button>

                            <Button 
                              variant="outline"
                              className="justify-start text-left text-xs font-semibold py-4 border-blue-500/20 hover:bg-blue-500/5 text-blue-400 rounded-xl"
                              onClick={() => executeTerminalCommand("syscheck --verify")}
                              disabled={telemetry.wazuhStatus === "disconnected" || telemetry.wazuhStatus === "isolated"}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Lancer Audit Syscheck
                            </Button>

                          </div>

                          <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            Note : L'exécution d'un playbook SOAR orchestre automatiquement des actions sur Wazuh, VirusTotal, MISP, TheHive et IRIS.
                          </p>
                        </div>
                      )}
                    </Card>

                  </div>

                </div>
              );
            })()}


          </div>
        )}


      </div>

      {/* ── Dialog : Ajouter une machine ── */}
      <Dialog open={addMachineOpen} onOpenChange={setAddMachineOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-0 overflow-hidden">
          {/* Header du dialog */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400" />
          <div className="px-6 pt-5 pb-2">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-800 dark:text-zinc-100 uppercase tracking-wide">
                    Enregistrer une nouvelle machine
                  </DialogTitle>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Organisation : <span className="font-bold text-slate-600 dark:text-zinc-300">{form.organization || "Client"}</span>
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-2 space-y-4">
            <Separator className="border-slate-100 dark:border-zinc-800" />

            {/* Nom de la machine */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Hash className="h-3 w-3" /> Nom de la machine <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="ex: desktop-rh-01"
                  value={newMachineForm.name}
                  onChange={e => setNewMachineForm({ ...newMachineForm, name: e.target.value })}
                  className="h-9 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" /> Adresse IP <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="ex: 192.168.1.45"
                  value={newMachineForm.ip}
                  onChange={e => setNewMachineForm({ ...newMachineForm, ip: e.target.value })}
                  className="h-9 text-sm font-mono bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Propriétaire */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="h-3 w-3" /> Propriétaire / Utilisateur <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="ex: Mamadou Diallo"
                value={newMachineForm.owner}
                onChange={e => setNewMachineForm({ ...newMachineForm, owner: e.target.value })}
                className="h-9 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* OS + MAC */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3" /> Système d'exploitation
                </Label>
                <Select value={newMachineForm.os} onValueChange={v => setNewMachineForm({ ...newMachineForm, os: v as any })}>
                  <SelectTrigger className="h-9 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 rounded-xl">
                    <SelectItem value="windows" className="text-sm font-semibold">🪟 Windows</SelectItem>
                    <SelectItem value="linux" className="text-sm font-semibold">🐧 Linux</SelectItem>
                    <SelectItem value="macos" className="text-sm font-semibold">🍎 macOS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Network className="h-3 w-3" /> Adresse MAC
                </Label>
                <Input
                  placeholder="ex: AA:BB:CC:DD:EE:FF"
                  value={newMachineForm.mac}
                  onChange={e => setNewMachineForm({ ...newMachineForm, mac: e.target.value })}
                  className="h-9 text-sm font-mono bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Département */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Département / Service
              </Label>
              <Input
                placeholder="ex: Direction Informatique — Bâtiment A"
                value={newMachineForm.department}
                onChange={e => setNewMachineForm({ ...newMachineForm, department: e.target.value })}
                className="h-9 text-sm bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-500/20">
              <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                L'agent EDR Wazuh sera déployé automatiquement sur cette machine et rattaché au groupe <span className="font-bold text-emerald-600 dark:text-emerald-400">{(form.organization || "client").toLowerCase().replace(/[^a-z0-9]/g, "-")}</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50/80 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
            <Button variant="outline" onClick={() => setAddMachineOpen(false)} className="rounded-xl border-slate-200 dark:border-zinc-700">
              Annuler
            </Button>
            <Button
              onClick={handleAddMachine}
              disabled={addingMachine}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold shadow-md shadow-emerald-500/20 border-none gap-2"
            >
              {addingMachine ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...</> : <><Plus className="h-4 w-4" /> Enregistrer la machine</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
