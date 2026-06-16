import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building, Mail, Phone, Globe, Shield, ArrowLeft, Loader2, Save, Power, PowerOff, KeyRound, Laptop, Download, UploadCloud, Copy, Check, Activity, FileText, Sparkles, Cpu, AlertTriangle, ShieldAlert, Terminal, Network, Zap, Settings, RefreshCw, AlertCircle, CircleDot, Play, Lock, Trash2, FolderSync } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { getClientExtendedData, downloadContractFile, ClientExtendedData, DEMO_CLIENTS } from "./clients.index";

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
    { type: "system", text: "=== CONSOLE AGENT WAZUH EDR REMOTE SHELL v4.7.2 ===" },
    { type: "system", text: "Tapez 'help' pour lister les commandes de diagnostic et remédiation." }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [activePlaybook, setActivePlaybook] = useState<string | null>(null);
  const [playbookStep, setPlaybookStep] = useState<number>(0);
  const [playbookLogs, setPlaybookLogs] = useState<string[]>([]);

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
          { type: "output" as const, text: `Version de l'agent : Wazuh EDR v4.7.2` },
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
            
            {/* Topologie et Flux de Logs Temps Réel (Grid 2 Colonnes) */}
            <div className="grid gap-6 md:grid-cols-3">
              
              {/* Carte Topologique EDR/Wazuh (2/3 de large sur desktop) */}
              <Card className="md:col-span-2 shadow-lg border-border/50 bg-card/60 backdrop-blur-sm p-5 relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                <div className="absolute top-4 left-4 z-10">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    <Network className="h-5 w-5 text-primary" /> Topologie de Protection Endpoint
                  </h3>
                  <p className="text-xs text-muted-foreground">Cartographie dynamique des agents Wazuh & Connecteurs</p>
                </div>
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-none font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span> 10.0.0.1 SOC HUB CONNECTÉ
                  </Badge>
                </div>

                {/* SVG Visual Node Graph — Laptops + Server */}
                <div className="flex-1 flex items-center justify-center min-h-[260px] relative pt-12">
                  {(() => {
                    // Quota par tier d'offre
                    const QUOTA_BY_TIER: Record<string, number> = {
                      Bronze: 5, Argent: 10, Or: 20, Platine: 50
                    };
                    const maxPcs = QUOTA_BY_TIER[extData.contractTier] ?? 10;
                    const usedPcs = extData.pcs.length;
                    const quotaReached = usedPcs >= maxPcs;

                    const addMachine = () => {
                      if (quotaReached) {
                        toast.error(`Quota atteint (${maxPcs} PC max pour l'offre ${extData.contractTier})`, {
                          description: "Mettez à niveau votre offre pour ajouter plus de machines."
                        });
                        return;
                      }
                      const newId = `${extData.clientId}-pc-${Date.now()}`;
                      const osList = ["windows", "linux", "macos"] as const;
                      const os = osList[usedPcs % osList.length];
                      const prefix = os === "windows" ? "desktop" : os === "linux" ? "srv" : "macbook";
                      const orgSlug = (form.organization || "client").toLowerCase().replace(/[^a-z0-9]/g, "-");
                      const newPc = {
                        id: newId,
                        name: `${prefix}-${orgSlug}-${String(usedPcs + 1).padStart(2, "0")}`,
                        os,
                        ip: `192.168.${Math.floor(Math.random() * 50) + 1}.${Math.floor(Math.random() * 200) + 10}`,
                        status: "active" as const,
                        cpu: Math.floor(Math.random() * 30) + 5,
                        ram: Math.floor(Math.random() * 40) + 20,
                        lastSeen: "À l'instant",
                        wazuhId: String(300 + usedPcs).padStart(3, "0"),
                      };
                      const updated = { ...extData, pcs: [...extData.pcs, newPc] };
                      setExtData(updated);
                      localStorage.setItem(`client_ext_${clientId}`, JSON.stringify(updated));
                      toast.success("Machine ajoutée !", { description: `${newPc.name} est maintenant surveillée par l'agent EDR.` });
                    };

                    return (
                      <div className="w-full flex flex-col gap-4">
                        {/* Quota bar */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-2.5 border border-border/30">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Quota machines — Offre <span className="text-primary">{extData.contractTier}</span>
                              </span>
                              <span className={`font-black ${quotaReached ? "text-rose-500" : "text-emerald-500"}`}>
                                {usedPcs} / {maxPcs} PC
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  quotaReached ? "bg-rose-500 animate-pulse" :
                                  usedPcs / maxPcs > 0.8 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min((usedPcs / maxPcs) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                          <button
                            onClick={addMachine}
                            disabled={quotaReached}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all border ${
                              quotaReached
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105"
                            }`}
                            title={quotaReached ? `Quota atteint (${maxPcs} max)` : "Ajouter une nouvelle machine"}
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current"><path d="M8 1a.5.5 0 0 1 .5.5v6h6a.5.5 0 0 1 0 1h-6v6a.5.5 0 0 1-1 0v-6h-6a.5.5 0 0 1 0-1h6v-6A.5.5 0 0 1 8 1z"/></svg>
                            {quotaReached ? "Quota max" : "Ajouter machine"}
                          </button>
                        </div>

                        {/* SVG topology */}
                        <svg className="w-full max-w-[600px] mx-auto" viewBox="0 0 540 260" style={{ minHeight: 200 }}>
                          <defs>
                            <radialGradient id="hubGlow2" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
                            </radialGradient>
                            <filter id="glow-green">
                              <feGaussianBlur stdDeviation="2.5" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <filter id="glow-red">
                              <feGaussianBlur stdDeviation="2" result="blur"/>
                              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                          </defs>

                          {/* Connection lines */}
                          {extData.pcs.map((pc, idx) => {
                            const telemetry = pcTelemetry[pc.id];
                            const status = telemetry?.wazuhStatus || pc.status;
                            const total = extData.pcs.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const rx = 190, ry = 88;
                            const tx = 270 + rx * Math.cos(angle);
                            const ty = 130 + ry * Math.sin(angle);
                            const strokeColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#64748b";
                            const dash = status === "isolated" ? "5,4" : status === "disconnected" ? "3,5" : "";
                            return (
                              <g key={`ln-${pc.id}`}>
                                <line x1="270" y1="130" x2={tx} y2={ty}
                                  stroke={strokeColor} strokeWidth="1.5" strokeDasharray={dash} opacity="0.5" />
                                {(status === "active" || status === "alert") && (
                                  <circle r="3" fill={strokeColor} opacity="0.85">
                                    <animateMotion dur={`${1.8 + idx * 0.35}s`} repeatCount="indefinite"
                                      path={`M270,130 L${tx},${ty}`} />
                                  </circle>
                                )}
                              </g>
                            );
                          })}

                          {/* ── SOC MANAGER — Server rack icon ── */}
                          <g className="cursor-pointer" onClick={() => setSelectedPcId(null)}>
                            <circle cx="270" cy="130" r="36" fill="url(#hubGlow2)" />
                            {/* Server rack body */}
                            <rect x="252" y="112" width="36" height="36" rx="4" className="fill-slate-900" stroke="hsl(var(--primary))" strokeWidth="1.5" />
                            {/* Server slots */}
                            {[0,1,2].map(i => (
                              <g key={i}>
                                <rect x="256" y={116 + i * 10} width="28" height="7" rx="1.5" className="fill-slate-800" />
                                <circle cx="260" cy={119.5 + i * 10} r="1.5" fill={i === 0 ? "#10b981" : i === 1 ? "#10b981" : "#f59e0b"} />
                                <rect x="264" y={118 + i * 10} width="16" height="2" rx="1" className="fill-slate-700" />
                              </g>
                            ))}
                            {/* Pulsing dot */}
                            <circle cx="270" cy="156" r="4" className="fill-primary opacity-20 animate-ping" />
                            <circle cx="270" cy="156" r="2.5" className="fill-primary" />
                            <text x="270" y="174" textAnchor="middle" fontSize="8" fontWeight="800"
                              className="fill-primary font-mono tracking-wider" letterSpacing="0.08em">
                              SOC MANAGER
                            </text>
                          </g>

                          {/* ── ENDPOINT NODES — Laptop icons ── */}
                          {extData.pcs.map((pc, idx) => {
                            const telemetry = pcTelemetry[pc.id];
                            const status = telemetry?.wazuhStatus || pc.status;
                            const isSelected = selectedPcId === pc.id;
                            const total = extData.pcs.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const rx = 190, ry = 88;
                            const cx = 270 + rx * Math.cos(angle);
                            const cy = 130 + ry * Math.sin(angle);

                            const borderColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#64748b55";
                            const screenColor = status === "active" ? "#052e16" : status === "alert" ? "#451a03" : status === "isolated" ? "#450a0a" : "#1e293b";
                            const dotColor = status === "active" ? "#10b981" : status === "alert" ? "#f59e0b" : status === "isolated" ? "#ef4444" : "#94a3b8";

                            // OS label character
                            const osChar = pc.os === "windows" ? "W" : pc.os === "linux" ? "L" : "M";

                            return (
                              <g key={`node-${pc.id}`} className="cursor-pointer"
                                onClick={() => setSelectedPcId(pc.id)}>

                                {/* Selection ring */}
                                {isSelected && (
                                  <circle cx={cx} cy={cy} r="22" fill="none" stroke="hsl(var(--primary))"
                                    strokeWidth="2" strokeDasharray="4,3" opacity="0.7">
                                    <animateTransform attributeName="transform" type="rotate"
                                      from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="4s" repeatCount="indefinite" />
                                  </circle>
                                )}

                                {/* Laptop screen */}
                                <rect x={cx - 12} y={cy - 13} width="24" height="15" rx="2"
                                  fill={screenColor} stroke={borderColor} strokeWidth={isSelected ? 2 : 1.5} />
                                {/* Screen glow / content */}
                                <rect x={cx - 10} y={cy - 11} width="20" height="11" rx="1" fill={screenColor} opacity="0.9" />
                                {/* OS text on screen */}
                                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="6" fontWeight="900"
                                  fill={borderColor} fontFamily="monospace">{osChar}</text>

                                {/* Laptop base/keyboard */}
                                <rect x={cx - 14} y={cy + 2} width="28" height="4" rx="1"
                                  fill="#1e293b" stroke={borderColor} strokeWidth="1" />
                                {/* Hinge notch */}
                                <rect x={cx - 4} y={cy + 5} width="8" height="2" rx="1" fill="#0f172a" />

                                {/* Status indicator dot */}
                                <circle cx={cx + 11} cy={cy - 12} r="3.5" fill={dotColor}
                                  filter={status === "active" ? "url(#glow-green)" : status === "isolated" ? "url(#glow-red)" : ""}>
                                  {(status === "active" || status === "alert") && (
                                    <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
                                  )}
                                </circle>

                                {/* PC name label */}
                                <text x={cx} y={cy + 18} textAnchor="middle" fontSize="7.5" fontWeight="600"
                                  fontFamily="monospace"
                                  className={isSelected ? "fill-primary" : "fill-muted-foreground"}>
                                  {pc.name.length > 14 ? `${pc.name.slice(0, 11)}…` : pc.name}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/30 pt-3 mt-2">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> En Ligne</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span> Alerte SOC</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Quarantaine</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-500/50"></span> Hors Ligne</span>
                  </div>
                  <div className="font-mono text-xs">Télémétrie : Chiffrement TLSv1.3 Actif</div>
                </div>
              </Card>

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
                        WZ-AGENT v4.7.2
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
