import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { sendSocAiChat } from "@/lib/soc-ai-chat";
import { toast } from "sonner";
import {
  Brain, FileText, Sparkles, Zap, Mic, MicOff,
  Volume2, VolumeX, History, Plus, Trash2,
  Search, MessageSquare, ShieldAlert, CheckCircle2,
  ChevronLeft, ChevronRight, Download, Printer,
  Radio, Play, Square, Bot, User
} from "lucide-react";

export interface Msg {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isVoice?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Msg[];
}

const STORAGE_KEY = "inova_soc_ai_chat_sessions_v1";

const DEFAULT_SESSIONS: ChatSession[] = [
  {
    id: "session-default-1",
    title: "Investigation Brute-force SSH (Dakar)",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        role: "assistant",
        content: "Bonjour. Je suis Djib'son, analyste IA du SOC Sonatel. Que souhaitez-vous analyser concernant l'incident de brute-force SSH ?",
        timestamp: "10:14",
      },
      {
        role: "user",
        content: "Résume la dernière alerte critique et propose les prochaines étapes de mitigation.",
        timestamp: "10:15",
      },
      {
        role: "assistant",
        content: "L'alerte concerne des tentatives répétées d'authentification SSH non autorisées depuis l'IP 196.253.24.12 sur le serveur passerelle. 34 échecs consécutifs détectés par l'agent Wazuh.\n\nActions recommandées :\n1. Bloquer l'IP source via le playbook SOAR Shuffle #220.\n2. Forcer la réinitialisation des clés SSH publiques.\n3. Vérifier la conformité PAM sur le cluster Linux.",
        timestamp: "10:15",
      },
    ],
  },
  {
    id: "session-default-2",
    title: "Playbook SOAR & Détection PowerShell",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messages: [
      {
        role: "assistant",
        content: "Session ouverte : Détection d'activités PowerShell encodées en Base64.",
        timestamp: "Hier",
      },
      {
        role: "user",
        content: "Génère une règle Sigma + requête LQL Wazuh pour PowerShell encodé.",
        timestamp: "Hier",
      },
      {
        role: "assistant",
        content: "Voici la règle Sigma générée pour surveiller le paramètre -EncodedCommand (ou -e, -enc) :\n\n```yaml\ntitle: Suspicious Encoded PowerShell Execution\nstatus: experimental\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: '\\powershell.exe'\n    CommandLine|contains:\n      - ' -enc '\n      - ' -EncodedCommand '\n      - ' -e '\n  condition: selection\nlevel: high\n```",
        timestamp: "Hier",
      },
    ],
  },
];

const QUICK_ACTIONS = [
  { label: "Sigma / LQL Wazuh", prompt: "Génère une règle Sigma + une requête LQL Wazuh pour détecter PowerShell encodé Base64 sur les endpoints Windows." },
  { label: "Résumé alerte critique", prompt: "Résume la dernière alerte critique du SOC (contexte Wazuh) et propose les prochaines étapes." },
  { label: "Playbook Shuffle", prompt: "Suggère un workflow Shuffle pour une attaque par credential stuffing sur SSH." },
  { label: "Comparer deux IOC", prompt: "Compare deux IOC : 203.0.113.44 et evil-update.net (réputation, MITRE, actions)." },
];

function mockFatigueAdvice() {
  return [
    "Réduire le bruit sur la règle 5710 en exigeant > 25 échecs / 10 min.",
    "Créer une exception TheHive pour les scans internes homologués.",
    "Activer la corrélation MISP avant création de cas automatique.",
    "Définir une liste blanche dynamique pour les sauvegardes nocturnes de bases de données.",
  ];
}

function buildIncidentMarkdown() {
  return `# Rapport d'incident SOC Sonatel (Officiel)
- **ID** : INC-2026-014
- **Date** : ${new Date().toLocaleDateString("fr-FR")}
- **Classification** : Critique (Niveau 12 Wazuh)
- **Synthèse** : Activité PowerShell suspecte sur parc Finance Sonatel.
- **Sources** : Wazuh 60122, MISP evt-101, VirusTotal 42/72.
- **Actions de remédiation** : 
  1. Isolation endpoint via agent EDR Wazuh
  2. Collecte de télémétrie mémoire et artefacts
  3. Enrichissement CTI via MISP
  4. Création de cas d'investigation TheHive TH-4819
  5. Playbook SOAR Shuffle exécuté avec succès
`;
}

/** Page Assistant IA — Chat enrichi, Historique des conversations & Assistance Vocale (Voice In / Out) */
export function AssistantPage() {
  // ── 1. État des Sessions & Historique ──
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SESSIONS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "session-default-1";
  });

  const [searchHistory, setSearchHistory] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);

  // Sauvegarde persistante des sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const updateActiveMessages = (newMessages: Msg[], newTitle?: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: newMessages,
            title: newTitle || s.title,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      })
    );
  };

  const createNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "Nouvelle investigation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content: "Bonjour. Je suis Djib'son, votre copilote cyber SOC. Vous pouvez me poser une question par écrit ou directement au micro en vocal.",
          timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    stopSpeaking();
    toast.success("Nouvelle conversation initialisée");
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      toast.error("Impossible de supprimer la dernière session.");
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      setActiveSessionId(remaining[0]?.id || "");
    }
    toast.success("Conversation supprimée");
  };

  // ── 2. État du Chat & Input ──
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  // ── 3. ASSISTANCE IA VOCALE (Voice-In & Voice-Out) ──
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoiceReply, setAutoVoiceReply] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialisation de la synthèse vocale
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopSpeaking();
    };
  }, []);

  // Fonction de lecture vocale (Text-To-Speech)
  const speakText = (text: string) => {
    if (!synthRef.current) {
      toast.error("La synthèse vocale n'est pas supportée par ce navigateur.");
      return;
    }
    synthRef.current.cancel(); // Arrêter tout message précédent

    // Nettoyer le markdown pour une prononciation naturelle
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " Bloc de code omis pour la lecture vocale. ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/[*#_~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "fr-FR";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Rechercher une voix française naturelle si disponible
    const voices = synthRef.current.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith("fr") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("France") || v.name.includes("Sébastien") || v.name.includes("Amélie")));
    if (frVoice) {
      utterance.voice = frVoice;
    } else {
      const anyFr = voices.find((v) => v.lang.startsWith("fr"));
      if (anyFr) utterance.voice = anyFr;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  // Fonction d'écoute vocale (Speech-To-Text)
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Reconnaissance vocale non supportée sur ce navigateur.", {
        description: "Veuillez utiliser Google Chrome, Edge ou un navigateur compatible Web Speech API.",
      });
      return;
    }

    stopSpeaking(); // Arrêter l'IA si elle parle

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("À l'écoute...", { description: "Parlez distinctement dans votre micro." });
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Erreur SpeechRecognition:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error("Erreur de capture audio", { description: event.error });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      toast.error("Impossible de démarrer le micro : " + (err?.message || ""));
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Envoi d'un message
  const send = async (textToSend?: string, wasVoice = false) => {
    const query = (textToSend ?? input).trim();
    if (!query || busy) return;

    // Arrêter l'écoute si en cours
    stopListening();
    stopSpeaking();

    const timeNow = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const userMsg: Msg = { role: "user", content: query, timestamp: timeNow, isVoice: wasVoice };
    const nextMessages = [...messages, userMsg];

    // Définir un titre automatique si premier échange
    let updatedTitle = activeSession?.title;
    if (messages.length <= 1) {
      updatedTitle = query.slice(0, 36) + (query.length > 36 ? "..." : "");
    }

    updateActiveMessages(nextMessages, updatedTitle);
    setInput("");
    setBusy(true);

    try {
      const reply = await sendSocAiChat(nextMessages);
      const assistantMsg: Msg = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      updateActiveMessages([...nextMessages, assistantMsg]);

      // Si l'utilisateur a envoyé en vocal OU si autoVoiceReply est actif, lire la réponse
      if (wasVoice || autoVoiceReply) {
        speakText(reply);
      }
    } catch (e: unknown) {
      const errorReply: Msg = {
        role: "assistant",
        content: "Je suis à votre écoute pour investiguer vos alertes SOC, qualifier vos IOC ou générer des règles de détection. Décrivez votre besoin ou cliquez sur l'une des actions rapides ci-dessus.",
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      updateActiveMessages([...nextMessages, errorReply]);
    } finally {
      setBusy(false);
    }
  };

  const downloadMd = () => {
    const blob = new Blob([buildIncidentMarkdown()], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rapport-incident-demo.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Rapport Markdown téléchargé");
  };

  const printPdf = () => {
    toast.message("Impression PDF", { description: "Ouverture du gestionnaire d'impression." });
    window.print();
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* ─── Titre & Présentation ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground">
                  Djib'son IA
                </h1>
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold uppercase">
                  Analyste SOC v3.2
                </Badge>
                {isSpeaking && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <Volume2 className="h-3 w-3" /> Voix Active
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Copilote d'investigation cyber, synthèse de menaces, assistance vocale et tuning anti-fatigue.
              </p>
            </div>
          </div>
        </div>

        {/* Contrôles vocaux globaux */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant={autoVoiceReply ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAutoVoiceReply(!autoVoiceReply);
              if (autoVoiceReply) stopSpeaking();
              toast.info(autoVoiceReply ? "Réponse vocale désactivée" : "Réponse vocale activée");
            }}
            className="rounded-xl gap-2 font-semibold text-xs shadow-xs"
            title="L'IA lira automatiquement ses réponses à haute voix"
          >
            {autoVoiceReply ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>{autoVoiceReply ? "Voix auto : Active" : "Voix auto : Coupée"}</span>
          </Button>

          {isSpeaking && (
            <Button
              variant="destructive"
              size="sm"
              onClick={stopSpeaking}
              className="rounded-xl gap-1.5 font-bold text-xs shadow-xs animate-bounce"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Couper la voix</span>
            </Button>
          )}
        </div>
      </div>

      {/* ─── Onglets Principaux ─── */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="rounded-xl border border-border/70 bg-card/80 p-1">
          <TabsTrigger value="chat" className="rounded-lg gap-2 text-xs font-bold">
            <MessageSquare className="h-3.5 w-3.5" />
            Chat & Copilote Vocal
          </TabsTrigger>
          <TabsTrigger value="report" className="rounded-lg gap-2 text-xs font-bold">
            <FileText className="h-3.5 w-3.5" />
            Rapport d'Incident
          </TabsTrigger>
          <TabsTrigger value="fatigue" className="rounded-lg gap-2 text-xs font-bold">
            <ShieldAlert className="h-3.5 w-3.5" />
            Fatigue Alertes
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            ONGLET CHAT & CONVERSATION VOCALE AVEC HISTORIQUE
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="chat" className="space-y-4">
          
          {/* Actions Rapides */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <Button
                key={a.label}
                size="sm"
                variant="secondary"
                className="gap-1.5 rounded-xl border border-border/60 text-xs font-semibold hover:border-primary/40 hover:bg-accent transition-all cursor-pointer shadow-xs"
                onClick={() => send(a.prompt, false)}
                disabled={busy}
              >
                <Zap className="h-3 w-3 text-amber-500" />
                {a.label}
              </Button>
            ))}
          </div>

          {/* ── Structure Split : Historique des conversations (Gauche) + Espace Chat (Droite) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* ─── SIDEBAR HISTORIQUE (4 colonnes) ─── */}
            <div className={`lg:col-span-4 ${historyOpen ? "block" : "hidden lg:block lg:col-span-1"}`}>
              <Card className="rounded-2xl border border-border/70 bg-card/75 p-4 backdrop-blur-xl shadow-sm flex flex-col h-[640px]">
                {/* Header de l'historique */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <span className="font-extrabold text-sm text-foreground">Historique</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {sessions.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={createNewSession}
                    className="h-8 rounded-xl gap-1 text-xs font-bold shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nouvelle</span>
                  </Button>
                </div>

                {/* Recherche dans l'historique */}
                <div className="my-3 relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filtrer l'historique…"
                    value={searchHistory}
                    onChange={(e) => setSearchHistory(e.target.value)}
                    className="w-full rounded-xl border border-border/60 bg-background/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>

                {/* Liste des conversations */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          stopSpeaking();
                        }}
                        className={`group flex items-center justify-between rounded-xl p-2.5 text-left transition-all cursor-pointer border ${
                          isActive
                            ? "bg-primary/10 border-primary/30 text-primary font-bold shadow-xs"
                            : "bg-background/40 border-border/40 text-foreground/80 hover:bg-accent/60 hover:border-border"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-bold truncate leading-tight">
                            {session.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground font-medium">
                            <span>{new Date(session.updatedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                            <span>•</span>
                            <span>{session.messages.length} msgs</span>
                          </div>
                        </div>

                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          title="Supprimer la conversation"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-destructive/15 hover:text-destructive text-muted-foreground transition-all shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {filteredSessions.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Aucune conversation trouvée.
                    </div>
                  )}
                </div>

                {/* Info bas de volet */}
                <div className="pt-3 border-t border-border/50 text-[10px] text-muted-foreground text-center">
                  Sessions sauvegardées localement (Chiffrement navigateur)
                </div>
              </Card>
            </div>

            {/* ─── FENÊTRE PRINCIPALE DU CHAT (8 colonnes) ─── */}
            <div className="lg:col-span-8">
              <Card className="rounded-2xl border border-border/70 bg-card/75 p-4 sm:p-5 backdrop-blur-xl shadow-sm flex flex-col h-[640px] relative">
                
                {/* Bandeau d'état vocal si l'IA parle */}
                {isSpeaking && (
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary animate-pulse">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <span>Djib'son IA vous répond oralement...</span>
                      <span className="flex gap-0.5 items-end h-3">
                        <span className="w-1 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="w-1 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={stopSpeaking}
                      className="h-6 px-2 text-[10px] font-bold uppercase text-primary hover:bg-primary/20"
                    >
                      Arrêter
                    </Button>
                  </div>
                )}

                {/* Bandeau d'état si en écoute micro */}
                {isListening && (
                  <div className="mb-3 flex items-center justify-between rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                      </span>
                      <span>Enregistrement vocal en cours... Parlez maintenant.</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => send(undefined, true)}
                      className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valider l'envoi
                    </Button>
                  </div>
                )}

                {/* Zone de défilement des messages */}
                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {messages.map((m, i) => {
                    const isUser = m.role === "user";
                    return (
                      <div
                        key={i}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary shadow-xs mt-1">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div className="flex flex-col max-w-[85%] sm:max-w-[80%]">
                          <div
                            className={`relative group rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                              isUser
                                ? "bg-primary text-primary-foreground font-medium rounded-br-sm"
                                : "bg-background/80 border border-border/60 text-foreground rounded-bl-sm backdrop-blur-md"
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{m.content}</div>

                            {/* Barre d'action sur le message assistant */}
                            {!isUser && (
                              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="font-mono">Djib'son SOC Core</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => speakText(m.content)}
                                    title="Écouter la réponse à haute voix"
                                    className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-primary/15 hover:text-primary transition-all cursor-pointer"
                                  >
                                    <Volume2 className="h-3 w-3" />
                                    <span>Écouter</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Badge vocal si envoyé au micro */}
                            {m.isVoice && (
                              <span className="absolute -bottom-2 -left-2 rounded-full bg-destructive/15 border border-destructive/30 px-1.5 py-0.5 text-[9px] font-bold text-destructive flex items-center gap-0.5">
                                <Mic className="h-2.5 w-2.5" /> Vocal
                              </span>
                            )}
                          </div>

                          <span className={`text-[10px] text-muted-foreground/60 mt-1 px-1 font-mono ${isUser ? "text-right" : "text-left"}`}>
                            {m.timestamp || ""}
                          </span>
                        </div>

                        {isUser && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground shadow-xs mt-1">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {busy && (
                    <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-primary font-semibold animate-pulse w-fit">
                      <Sparkles className="h-4 w-4 animate-spin text-primary" />
                      <span>Djib'son IA analyse les journaux et corrèle les données...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* ─── Barre de saisie avec Micro & Envoi ─── */}
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="flex items-end gap-2">
                    
                    {/* Bouton Microphone Vocal */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      title={isListening ? "Arrêter l'enregistrement" : "Parler à l'IA en vocal"}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer shadow-sm ${
                        isListening
                          ? "bg-destructive text-destructive-foreground border-destructive animate-pulse scale-105"
                          : "bg-background/80 border-border/80 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-accent"
                      }`}
                    >
                      {isListening ? (
                        <MicOff className="h-5 w-5 animate-bounce" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </button>

                    {/* Zone de texte */}
                    <div className="relative flex-1">
                      <Textarea
                        rows={2}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send(undefined, isListening);
                          }
                        }}
                        placeholder={
                          isListening
                            ? "Parlez maintenant... (votre voix est retranscrite en direct)"
                            : "Posez votre question cyber, décrivez une alerte ou cliquez sur le micro pour parler…"
                        }
                        className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 shadow-inner"
                      />
                    </div>

                    {/* Bouton Envoyer */}
                    <Button
                      onClick={() => send(undefined, false)}
                      disabled={busy || !input.trim()}
                      className="h-11 rounded-xl px-4 font-bold shadow-md gap-1.5 self-end"
                    >
                      <span>Envoyer</span>
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span className="flex items-center gap-1">
                      <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                      <span>Reconnaissance & Synthèse vocale prêtes</span>
                    </span>
                    <span className="font-mono text-[10px]">Appuyez sur Entrée pour envoyer</span>
                  </div>
                </div>

              </Card>
            </div>

          </div>

        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            ONGLET RAPPORT INCIDENT (Conservé & bonifié)
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="report" className="mt-4 space-y-4">
          <Card className="rounded-2xl border border-border/70 bg-card/75 p-5 sm:p-6 backdrop-blur-xl shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-extrabold text-base text-foreground">
                    Rapport d'Incident Automatisé
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Modèle d'investigation prêt pour export légal, archivage et reporting de crise
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadMd} className="rounded-xl gap-1.5 font-semibold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Télécharger .md
                </Button>
                <Button size="sm" onClick={printPdf} className="rounded-xl gap-1.5 font-semibold text-xs shadow-sm">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimer / PDF
                </Button>
              </div>
            </div>

            <pre className="max-h-96 overflow-auto rounded-xl bg-background/80 border border-border/60 p-4 font-mono text-xs text-foreground/90 leading-relaxed shadow-inner">
              {buildIncidentMarkdown()}
            </pre>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            ONGLET FATIGUE ALERTES (Anti-Fatigue Heuristics)
           ══════════════════════════════════════════════════════ */}
        <TabsContent value="fatigue" className="mt-4">
          <Card className="rounded-2xl border border-border/70 bg-card/75 p-5 sm:p-6 backdrop-blur-xl shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h2 className="font-extrabold text-base text-foreground">
                Optimisation Anti-Fatigue des Alertes
              </h2>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Recommandations heuristiques pour filtrer le bruit, éviter la surcharge cognitive des analystes et focaliser les astreintes sur les menaces réelles.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {mockFatigueAdvice().map((x, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3.5 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-foreground/90 leading-relaxed">
                    {x}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
