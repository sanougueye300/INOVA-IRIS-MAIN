import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, ArrowRight, Check, X, Shield, Lock, CreditCard,
  Phone, Smartphone, CheckCircle, RefreshCw, Cpu, Database, 
  Search, FolderOpen, Zap, Fingerprint, Eye, EyeOff, HelpCircle,
  Building2, MapPin, Briefcase, Mail, Send, CheckSquare, Sparkles,
  Loader2, ArrowRightCircle, Clock, ChevronDown,
  Laptop, ShieldAlert, HeartHandshake, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadOffers, type Offer } from "@/lib/offers";
import { createPaytechCheckout, isPaytechConfigured } from "@/lib/paytech";
import { StripeCardForm } from "@/components/StripeCardForm";
import orangeLogo from "@/assets/orange-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INOVA-IRIS — Abonnement Cyberdéfense Sonatel" },
      { name: "description", content: "Souscrivez à la plateforme SOC de nouvelle génération. Détection et remédiation automatique des cybermenaces." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
      }
    ]
  }),
  component: LandingPage,
});

const FAQS = [
  {
    q: "Où sont hébergées mes données de cybersécurité ?",
    a: "Toutes les données de télémétrie, d'incidents et de configuration sont stockées localement au Sénégal dans les centres de données certifiés de la Sonatel, garantissant une souveraineté nationale totale."
  },
  {
    q: "Comment fonctionne l'attribution des accès après paiement ?",
    a: "Dès que votre paiement par Wave, Orange Money ou Carte Bancaire est validé, notre système génère instantanément vos identifiants réseau de connexion. Vous pouvez alors accéder à votre console client sans délai."
  },
  {
    q: "Puis-je changer d'offre ou résilier mon abonnement ?",
    a: "Oui, tous nos plans sont sans engagement de durée. Vous pouvez faire évoluer votre offre ou résilier votre abonnement directement depuis votre espace de facturation client à tout moment."
  }
];

const SENEGAL_BANKS = [
  { id: "sg", name: "SG Sénégal (Société Générale)" },
  { id: "cbao", name: "CBAO Groupe Attijariwafa bank" },
  { id: "ecobank", name: "Ecobank Sénégal" },
  { id: "bhs", name: "Banque de l'Habitat du Sénégal (BHS)" },
  { id: "orabank", name: "Orabank Sénégal" },
  { id: "boa", name: "Bank of Africa (BOA)" },
  { id: "gim", name: "GIM-UEMOA (Cartes Interbancaires)" }
];

function LandingPage() {
  const navigate = useNavigate();
  const [activeMenuTab, setActiveMenuTab] = useState("offres");
  const [offers, setOffers] = useState<Offer[]>([]);
  
  // Interactive Validation states for pricing cards
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [validatingPlanId, setValidatingPlanId] = useState<string | null>(null);
  const [validatedPlanId, setValidatedPlanId] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState(0);
  const [currentValidationStep, setCurrentValidationStep] = useState(0);

  // Simulated live cyber logs for the Hero dashboard
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([
    "Initialisation de la surveillance SOC...",
    "Connecteur Wazuh EDR connecté avec succès.",
    "MISP Threat Intelligence: 0 menace détectée."
  ]);

  const [checkoutPlan, setCheckoutPlan] = useState<Offer | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"account" | "method" | "payment" | "processing" | "success">("account");
  
  // Checkout Form states (No password field, auto-generated later)
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [businessSector, setBusinessSector] = useState("Finance");

  // Payment states PayTech (Wave, Orange Money, Free Money, Wizall, Carte Bancaire, Guichet)
  const [paymentMethod, setPaymentMethod] = useState<"paytech_guichet" | "wave" | "om" | "free" | "wizall" | "card">("paytech_guichet");
  const [isPaytechRedirecting, setIsPaytechRedirecting] = useState(false);
  const [paytechRedirectUrl, setPaytechRedirectUrl] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  useEffect(() => {
    // Load offers from the catalog (localStorage with shared library fallbacks)
    const loaded = loadOffers();
    setOffers(loaded);
    // Auto-select the popular plan (Terranga Secure) if active
    const proPlan = loaded.find(o => o.theme === "blue");
    if (proPlan) {
      setSelectedPlanId(proPlan.id);
    } else if (loaded.length > 0) {
      setSelectedPlanId(loaded[0].id);
    }
  }, []);

  // Détection du retour de paiement PayTech via les paramètres d'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment_status");
    const refCommand = urlParams.get("ref");
    const planId = urlParams.get("plan");

    if (paymentStatus === "success") {
      toast.success("Paiement PayTech confirmé avec succès !", {
        description: `Référence transaction : ${refCommand || "PayTech-OK"}`
      });
      const loaded = loadOffers();
      const targetPlan = loaded.find(o => o.id === planId) || loaded[0];
      if (targetPlan) {
        setCheckoutPlan(targetPlan);
        setCheckoutStep("success");
        setShowCheckoutModal(true);
      }
    } else if (paymentStatus === "cancel") {
      toast.error("Règlement PayTech annulé.", {
        description: "Vous pouvez retenter votre souscription SOC à tout moment."
      });
    }
  }, []);

  // Rolling cyber logs effect for the hero dashboard mockup
  useEffect(() => {
    const logPool = [
      "Wazuh Agent: Tentative de brute-force SSH bloquée (IP: 196.253.24.12)",
      "Shuffle SOAR: Playbook 'Vérification de réputation IP' exécuté",
      "VirusTotal API: Hash SHA256 analysé — Statut sain (0 détection)",
      "MISP CTI: Flux d'indicateurs de compromission synchronisé",
      "DFIR-IRIS: Rapport d'audit mensuel généré automatiquement",
      "Wazuh Manager: Alerte niveau 12 détectée sur Serveur-Prod-01 — Résolu",
      "TheHive Case Management: Incident #10432 fermé avec succès",
      "Shuffle SOAR: Playbook 'Quarantaine de fichier suspect' déclenché",
      "EDR Monitor: 145 agents actifs signalés sur le sous-réseau PME"
    ];

    const interval = setInterval(() => {
      const randomLog = logPool[Math.floor(Math.random() * logPool.length)];
      const now = new Date().toLocaleTimeString("fr-FR");
      setSimulatedLogs(prev => [`[${now}] ${randomLog}`, ...prev.slice(0, 4)]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-active");
          }
        });
      },
      { threshold: 0.05 }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [offers]); // Trigger whenever offers load to re-observe

  // Professional Validation flow on select plan
  const handleSelectPlan = (plan: Offer) => {
    if (validatingPlanId) return; // Prevent double validation while running

    setSelectedPlanId(plan.id);
    setValidatingPlanId(plan.id);
    setValidatedPlanId(null);
    setValidationProgress(0);
    setCurrentValidationStep(0);
    
    // Simulate active validation check over 2.4 seconds
    const interval = setInterval(() => {
      setValidationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setValidatingPlanId(null);
          setValidatedPlanId(plan.id);
          toast.success(`Offre "${plan.name}" validée avec succès !`, {
            description: "Votre tenant de cybersécurité SOC est configuré et prêt."
          });
          return 100;
        }

        const nextProgress = prev + 5;
        if (nextProgress < 30) {
          setCurrentValidationStep(0);
        } else if (nextProgress < 60) {
          setCurrentValidationStep(1);
        } else if (nextProgress < 90) {
          setCurrentValidationStep(2);
        } else {
          setCurrentValidationStep(3);
        }
        return nextProgress;
      });
    }, 120);
  };

  const [paytechErrorDetails, setPaytechErrorDetails] = useState<string | null>(null);

  const openCheckout = (plan: Offer) => {
    // Réinitialiser tous les états du formulaire à chaque ouverture
    setCheckoutPlan(plan);
    setCheckoutStep("account");
    setCompanyName("");
    setFullName("");
    setEmail("");
    setPhone("");
    setPhysicalAddress("");
    setBusinessSector("Finance");
    setPaymentMethod("paytech_guichet");
    setIsPaytechRedirecting(false);
    setPaytechRedirectUrl("");
    setGeneratedPassword("");
    setPaytechErrorDetails(null);
    setShowCheckoutModal(true);
  };

  const handleInitiatePaytech = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkoutPlan) return;

    if (!companyName.trim() || !fullName.trim() || !email.trim() || !phone.trim() || !physicalAddress.trim()) {
      toast.error("Veuillez renseigner toutes les informations de votre entreprise.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Adresse e-mail invalide. Vérifiez le format (ex: contact@societe.sn).");
      return;
    }

    const phoneDigits = phone.replace(/[\s\-().+]/g, "");
    if (phoneDigits.length < 8) {
      toast.error("Numéro de téléphone invalide. Saisissez un numéro valide (ex: 77 000 00 00).");
      return;
    }

    setIsPaytechRedirecting(true);
    setPaytechErrorDetails(null);

    // Générer le mot de passe maintenant
    const pass = "INOVA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedPassword(pass);

    const registeredUser = {
      email,
      password: pass,
      fullName,
      companyName,
      phone,
      address: physicalAddress,
      sector: businessSector,
      planId: checkoutPlan.id,
      planName: checkoutPlan.name,
      paymentMethod: "PAYTECH"
    };
    localStorage.setItem("inova_registered_user", JSON.stringify(registeredUser));

    try {
      const paytechRes = await createPaytechCheckout({
        offerId: checkoutPlan.id,
        offerName: checkoutPlan.name,
        amount: checkoutPlan.value,
        targetPayment: "PayTech",
        customer: {
          email,
          fullName,
          phone,
          companyName,
          businessSector,
          physicalAddress
        }
      });

      if (paytechRes.success && (paytechRes.redirect_url || paytechRes.token)) {
        const destUrl = paytechRes.redirect_url || `https://paytech.sn/payment/checkout/${paytechRes.token}`;
        setPaytechRedirectUrl(destUrl);
        toast.success(`Passerelle PayTech initialisée avec succès !`, {
          description: `Redirection en cours... Référence : ${paytechRes.ref_command}`
        });

        // Navigation vers la page officielle PayTech
        setTimeout(() => {
          window.location.href = destUrl;
        }, 1200);
      } else {
        throw new Error(paytechRes.error || "La passerelle PayTech n'a pas pu initialiser la transaction");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erreur de connexion";
      console.warn("Traitement PayTech :", errMsg);
      setIsPaytechRedirecting(false);
      setPaytechErrorDetails(errMsg);
      toast.error("Impossible de contacter la passerelle PayTech en direct.", {
        description: "Vous pouvez retenter ou valider immédiatement votre accès en mode direct."
      });
    }
  };

  // Real Stripe card payment succeeded → provision the account, show success step
  const handleStripeSuccess = (_subscriptionId: string) => {
    const pass = "INOVA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedPassword(pass);

    const registeredUser = {
      email,
      password: pass,
      fullName,
      companyName,
      phone,
      address: physicalAddress,
      sector: businessSector,
      planId: checkoutPlan?.id,
      planName: checkoutPlan?.name,
    };
    localStorage.setItem("inova_registered_user", JSON.stringify(registeredUser));
    setCheckoutStep("success");
    toast.success("Paiement Stripe validé ! Vos accès ont été configurés.");
  };

  const handleAccessDashboard = () => {
    // Enregistrer la session mock pour accès au dashboard
    const mockSession = {
      id: "mock-uid-123",
      email: email,
      organization: companyName,
      user_metadata: { full_name: fullName }
    };
    localStorage.setItem("inova_mock_user", JSON.stringify(mockSession));
    
    // Nettoyer les paramètres d'URL de retour PayTech
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    // Fermer la modal et naviguer vers le dashboard
    setShowCheckoutModal(false);
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="bg-[#ffffff] text-slate-900 min-h-screen font-sans overflow-x-hidden relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* Floating Glowing Background Blur Circles (Premium Modern SaaS style) */}
      <div className="absolute top-[8%] right-[5%] w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] rounded-full bg-orange-500/10 blur-[90px] sm:blur-[130px] pointer-events-none animate-bubble-1 z-0" />
      <div className="absolute top-[25%] left-[-5%] w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] rounded-full bg-blue-500/10 blur-[100px] sm:blur-[140px] pointer-events-none animate-bubble-2 z-0" />
      <div className="absolute top-[50%] right-[8%] w-[300px] sm:w-[380px] h-[300px] sm:h-[380px] rounded-full bg-amber-500/8 blur-[90px] sm:blur-[120px] pointer-events-none animate-bubble-1 z-0" />

      {/* HEADER SECTION - EXACT REPRODUCTION OF DELICUT BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo brand INOVA IRIS next to Orange logo */}
          <div className="flex items-center gap-2.5">
            <img
              src={orangeLogo}
              alt="Orange Logo"
              className="h-7 w-auto object-contain"
            />
            <span className="font-extrabold text-[15px] sm:text-[17px] tracking-wider text-[#FF7900] select-none font-mono">
              INOVA IRIS
            </span>
          </div>

          {/* Navigation links inside pill capsule */}
          <nav className="hidden md:flex items-center bg-slate-100/80 border border-slate-200/40 rounded-full px-2.5 py-1.5 gap-2">
            {[
              { id: "offres", label: "Abonnements", href: "#offres" },
              { id: "services", label: "Services SOC", href: "#services" },
              { id: "pourquoi", label: "Pourquoi INOVA", href: "#pourquoi" },
              { id: "faq", label: "FAQ", href: "#faq" }
            ].map((link) => {
              const active = activeMenuTab === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setActiveMenuTab(link.id)}
                  className={`text-xs font-semibold px-4.5 py-1.5 rounded-full transition-all ${
                    active 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Right Button (Dark rounded pill) + Hamburger */}
          <div className="flex items-center gap-3">
            <Button asChild className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-6 py-2 h-9 rounded-full transition-colors cursor-pointer shadow-sm">
              <Link to="/login">Connexion</Link>
            </Button>
            
            <button className="flex items-center justify-center h-9 w-9 rounded-full bg-slate-100 border border-slate-200/40 text-slate-700 hover:bg-slate-200/50 transition-colors">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION - MODERN 2-COLUMN PREMIUM SAAS LAYOUT */}
      <section className="relative pt-36 pb-24 lg:pt-44 lg:pb-32 px-6 overflow-hidden bg-gradient-to-b from-slate-50/60 to-white/20 border-b border-slate-100/80 z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading text & CTAs */}
          <div className="lg:col-span-7 text-left flex flex-col items-start space-y-6 reveal-on-scroll">
            


            {/* Headline matching typography proportions */}
            <h1 className="text-4xl sm:text-[56px] lg:text-[64px] leading-[1.08] font-extrabold tracking-tight text-slate-950">
              La Solution de Cyberdéfense
              <span className="block text-[#64748b] font-medium mt-1">
                Souveraine & Automatisée
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed font-light">
              Détectez et neutralisez les cybermenaces en temps réel. Souscrivez en ligne via Wave ou Orange Money et accédez à votre console SOC instantanément, sans délai d'intégration complexe.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-wrap gap-4 pt-2 w-full sm:w-auto">
              <a 
                href="#offres" 
                className="w-full sm:w-auto text-center bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs px-8 py-3 rounded-full transition-all shadow-md shadow-orange-500/10 hover:scale-[1.02]"
              >
                Voir les Abonnements
              </a>
              <Link 
                to="/workflow" 
                className="w-full sm:w-auto text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-6 py-3 rounded-full transition-all"
              >
                Découvrir les Fonctionnalités
              </Link>
            </div>

            {/* Small Quick stats / partners */}
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-100 w-full text-slate-400 text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Supervision Souveraine</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#FF7900]" />
                <span>Paiement Wave, OM, Carte</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-500" />
                <span>Déploiement EDR Eclair</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive CSS Live Security Console Mockup */}
          <div className="lg:col-span-5 w-full flex justify-center reveal-on-scroll reveal-delay-200">
            <div className="bg-[#080d1a] border border-slate-800 bg-grid-dark rounded-2xl p-5 shadow-2xl relative overflow-hidden font-mono text-[11px] text-slate-300 w-full max-w-md">
              {/* Laser scan line overlay */}
              <div className="scan-laser pointer-events-none" />

              {/* Title Bar */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-slate-500 ml-2">inova-soc-monitor://dakar.main</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-transparent text-[8px] font-bold tracking-widest uppercase rounded py-0 px-2 animate-pulse">
                  ONLINE
                </Badge>
              </div>

              {/* Stat indicators */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-lg p-2 text-center">
                  <span className="text-[9px] text-slate-500 block uppercase">Agents EDR</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">145 / 145</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-lg p-2 text-center">
                  <span className="text-[9px] text-slate-500 block uppercase">MTTD</span>
                  <span className="text-xs font-bold text-orange-400 mt-0.5 block">8 min</span>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/50 rounded-lg p-2 text-center">
                  <span className="text-[9px] text-slate-500 block uppercase">SOC Node</span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5 block">SAIN</span>
                </div>
              </div>

              {/* Interactive Radar & Logs Section */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mb-4">
                {/* Radar Grid (left 5 columns) */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 border border-slate-800/40 rounded-xl bg-slate-950/40">
                  <div className="h-24 w-24 rounded-full border border-slate-800 relative flex items-center justify-center overflow-hidden">
                    {/* Concentric grid circles */}
                    <div className="absolute h-16 w-16 rounded-full border border-slate-800/60" />
                    <div className="absolute h-8 w-8 rounded-full border border-slate-800/40" />
                    <div className="absolute inset-x-0 h-px bg-slate-800/40" />
                    <div className="absolute inset-y-0 w-px bg-slate-800/40" />
                    
                    {/* Rotating conic gradient sweep */}
                    <div className="radar-sweep absolute inset-0" />

                    {/* Threat dots */}
                    <div className="absolute top-[25%] left-[30%] h-2 w-2 rounded-full bg-red-500 radar-dot shadow-[0_0_10px_#ef4444]" />
                    <div className="absolute bottom-[20%] right-[25%] h-2 w-2 rounded-full bg-orange-400 radar-dot shadow-[0_0_8px_#fb923c]" style={{ animationDelay: '0.8s' }} />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-2 tracking-wider uppercase">Radar Actif EDR</span>
                </div>

                {/* Logs Terminal (right 7 columns) */}
                <div className="sm:col-span-7 space-y-1.5">
                  <span className="text-[9px] text-slate-500 block uppercase tracking-wider">Flux d'incidents SOC :</span>
                  <div className="bg-[#030712] rounded-xl p-3 border border-slate-800/60 h-28 overflow-hidden space-y-2 text-[9px] text-slate-400">
                    {simulatedLogs.map((log, idx) => {
                      const isAlert = log.includes("Alerte") || log.includes("brute-force") || log.includes("suspect");
                      const isSuccess = log.includes("succès") || log.includes("connecté") || log.includes("sain");
                      
                      let textColor = "text-slate-400";
                      if (isAlert) textColor = "text-orange-400 font-semibold";
                      else if (isSuccess) textColor = "text-emerald-400";

                      return (
                        <div key={idx} className={`leading-normal truncate transition-all duration-500 ${textColor}`}>
                          {log}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom system console footer */}
              <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-[9px] text-slate-500">
                <span>Vérification d'intégrité : OK</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  SHUFFLE & WAZUH SYNCED
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* PLANS & SUBSCRIPTIONS SECTION - PREMIUM PRICING EXPERIENCE */}
      <section id="offres" className="relative py-32 px-6 bg-gradient-to-b from-white via-slate-50/40 to-white border-t border-slate-100 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-20 reveal-on-scroll">
            <Badge className="bg-orange-500/10 text-orange-600 border border-orange-200/50 font-bold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full mb-4 inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              FORMULES D'ABONNEMENT
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-950 tracking-tight mb-6">
              Choisissez votre formule SOC
            </h2>
            <p className="text-lg text-slate-600 font-light leading-relaxed">
              Démarrez votre transformation en cybersécurité avec une plateforme SOC complète, flexible et évolutive conçue pour les entreprises africaines.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-16 reveal-on-scroll reveal-delay-100 px-2">
            {offers.filter(o => o.isActive).map((plan) => {
              const isPopular = plan.theme === "blue";
              const active = selectedPlanId === plan.id;

              const themeMap: Record<string, { card: string; badge: string; check: string; bar: string; button: string }> = {
                orange: {
                  card: "border-orange-400/40 bg-gradient-to-br from-orange-500/8 via-transparent to-orange-400/4 shadow-orange-500/10 shadow-xl",
                  badge: "bg-gradient-to-r from-orange-500 to-red-500 text-white border-none font-extrabold shadow-lg shadow-orange-500/30",
                  check: "text-orange-500",
                  bar: "#f97316",
                  button: "bg-orange-500 hover:bg-orange-600",
                },
                blue: {
                  card: "border-blue-400/40 bg-gradient-to-br from-blue-500/8 via-transparent to-indigo-400/4 shadow-blue-500/10 shadow-xl",
                  badge: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-none font-bold shadow-lg shadow-blue-500/30",
                  check: "text-blue-500",
                  bar: "#3b82f6",
                  button: "bg-blue-500 hover:bg-blue-600",
                },
                gold: {
                  card: "border-amber-400/40 bg-gradient-to-br from-amber-500/8 via-transparent to-yellow-400/4 shadow-amber-500/10 shadow-xl",
                  badge: "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-none font-extrabold shadow-lg shadow-amber-500/30",
                  check: "text-amber-500",
                  bar: "#f59e0b",
                  button: "bg-amber-500 hover:bg-amber-600",
                },
              };

              const colors = themeMap[plan.theme as keyof typeof themeMap] || themeMap.orange;

              return (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`relative group rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${colors.card} hover:scale-[1.02] hover:shadow-2xl ${
                    isPopular ? "lg:scale-105" : ""
                  } ${active ? "ring-2 ring-offset-2 ring-offset-white" : ""}`}
                >
                  {/* Popular corner ribbon */}
                  {isPopular && (
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-[10px] rotate-45 z-20 shadow-lg">
                      <span className="-rotate-45">POPULAIRE</span>
                    </div>
                  )}

                  {/* Top color bar */}
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${colors.bar}80, transparent)` }} />

                  <div className="p-6 flex flex-col h-full">

                    {/* Badge + active check */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge className={`px-3 py-1 rounded-full text-xs ${colors.badge}`}>{plan.name}</Badge>
                      {active && <Check className={`h-5 w-5 ${colors.check} shrink-0`} />}
                    </div>

                    {/* Description */}
                    {plan.description && (
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{plan.description}</p>
                    )}

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900">{plan.value.toLocaleString("fr-FR")}</span>
                        <span className="text-base font-medium text-slate-500"> {plan.currency}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">par mois</div>
                    </div>

                    <div className="border-t border-slate-200/60 my-4" />

                    {/* Specs */}
                    <div className="space-y-2.5 mb-5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Laptop className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Inclus : <strong className="text-slate-800">{plan.maxPcs} postes</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>MTTD : <strong className="text-slate-800">{plan.mttd}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>MTTR : <strong className="text-slate-800">{plan.mttr}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <HeartHandshake className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Support : <strong className="text-slate-800">{plan.support}</strong></span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/60 my-4" />

                    {/* Features */}
                    <div className="flex-grow mb-6">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Fonctionnalités</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${colors.check}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan);
                      }}
                      className={`w-full font-bold h-11 rounded-xl transition-all duration-300 text-white text-sm shadow-md hover:shadow-lg ${colors.button}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        {active ? (
                          <><Check className="h-4 w-4" /> Sélectionné</>
                        ) : (
                          <>Choisir cette formule <ArrowRight className="h-4 w-4" /></>
                        )}
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Action Bar */}
          {selectedPlanId && (
            <div className="max-w-2xl mx-auto animate-fade-up">
              <div className={`rounded-2xl p-6 border-2 transition-all duration-300 backdrop-blur-sm ${
                selectedPlanId === offers.find(o => o.theme === "blue")?.id
                  ? "bg-gradient-to-r from-blue-50 to-blue-50/50 border-blue-200 shadow-lg shadow-blue-500/10"
                  : selectedPlanId === offers.find(o => o.theme === "gold")?.id
                  ? "bg-gradient-to-r from-amber-50 to-amber-50/50 border-amber-200 shadow-lg shadow-amber-500/10"
                  : "bg-gradient-to-r from-orange-50 to-orange-50/50 border-orange-200 shadow-lg shadow-orange-500/10"
              }`}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Offre sélectionnée</p>
                    <h4 className="text-lg font-bold text-slate-900">
                      {offers.find(o => o.id === selectedPlanId)?.name} — 
                      <span className="text-orange-600 ml-2">
                        {offers.find(o => o.id === selectedPlanId)?.value.toLocaleString()} FCFA/mois
                      </span>
                    </h4>
                  </div>

                  <Button 
                    onClick={() => {
                      const chosen = offers.find(o => o.id === selectedPlanId);
                      if (chosen) openCheckout(chosen);
                    }}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  >
                    Procéder au paiement <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Table (Optional Expansion) */}
          <div className="mt-20 reveal-on-scroll">
            <details className="group cursor-pointer">
              <summary className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 transition-colors pb-6">
                <ChevronDown className="h-5 w-5 group-open:rotate-180 transition-transform" />
                Voir la comparaison détaillée des formules
              </summary>
              
              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 font-bold text-slate-900">Fonctionnalité</th>
                      {offers.filter(o => o.isActive).map(plan => (
                        <th key={plan.id} className="text-center p-4 font-bold text-slate-900">{plan.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["MTTD", "MTTR", "Agents EDR", "Support", "SIEM Wazuh", "SOAR Shuffle", "CTI MISP", "TheHive"].map((feature, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-4 font-semibold text-slate-700">{feature}</td>
                        {offers.filter(o => o.isActive).map(plan => (
                          <td key={plan.id} className="text-center p-4">
                            {feature === "MTTD" && <span className="font-bold text-orange-600">{plan.mttd}</span>}
                            {feature === "MTTR" && <span className="font-bold text-orange-600">{plan.mttr}</span>}
                            {feature === "Agents EDR" && <span className="font-bold text-orange-600">{plan.maxPcs}</span>}
                            {feature === "Support" && <span className="text-slate-600">{plan.support}</span>}
                            {(feature === "SIEM Wazuh" || feature === "SOAR Shuffle" || feature === "CTI MISP" || feature === "TheHive") && (
                              plan.features.some(f => f.toLowerCase().includes(feature.toLowerCase())) ? (
                                <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                              ) : (
                                <X className="h-5 w-5 text-slate-300 mx-auto" />
                              )
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* SERVICES SOC BRICKS SECTION */}
      <section id="services" className="py-24 px-6 bg-slate-50/60 border-t border-slate-100 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Une Architecture SOC Intégrée</h2>
            <p className="mt-3 text-slate-500 text-sm font-light">La puissance des meilleurs outils open source unifiés sous une couche d'automatisation.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 reveal-on-scroll reveal-delay-200">
            {[
              { title: "Wazuh SIEM", desc: "Supervise la sécurité locale de vos serveurs et endpoints.", icon: Cpu },
              { title: "Shuffle SOAR", desc: "Orchestre et exécute automatiquement vos playbooks de remédiation.", icon: Zap },
              { title: "MISP CTI", desc: "Vérifie les indicateurs de compromission en temps réel.", icon: Database },
              { title: "TheHive Case Mgmt", desc: "Fournit un espace d'investigation et d'historisation collaborative.", icon: FolderOpen },
              { title: "VirusTotal API", desc: "Valide la réputation cyber des URLs et hashes suspects.", icon: Search },
              { title: "DFIR-IRIS", desc: "Permet de collecter les preuves mémoire en direct en cas d'attaque.", icon: Fingerprint }
            ].map((svc, i) => {
              const SvcIcon = svc.icon;
              return (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                  <div className="h-10 w-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-[#FF7900] mb-4">
                    <SvcIcon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{svc.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">{svc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SOVEREIGNTY / TRUST SECTION */}
      <section id="pourquoi" className="py-24 px-6 bg-white relative z-10 border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center reveal-on-scroll">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-transparent font-bold text-[9px] tracking-wider uppercase px-3 py-1 rounded-full mb-6">
            sécurité souveraine
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Pourquoi choisir INOVA-IRIS ?</h2>
          <p className="mt-4 text-sm text-slate-500 leading-relaxed font-light max-w-xl mx-auto">
            INOVA-IRIS garantit que l'ensemble des journaux d'activité et des audits de sécurité de votre structure ne transitent pas hors du territoire national. Toutes vos données sont hébergées et traitées localement au Sénégal par les experts SecOps de Sonatel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 text-left reveal-on-scroll reveal-delay-200">
            {[
              { title: "Résidence Locale", desc: "Zéro export de données réseau hors du Sénégal." },
              { title: "Paiement Simple", desc: "Wave, Orange Money et Cartes pris en charge localement." },
              { title: "Accès Instantané", desc: "Compte opérationnel dès la validation du paiement." }
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 hover:border-slate-200 hover:shadow-md transition-all">
                <CheckCircle className="h-5 w-5 text-emerald-500 mb-3" />
                <h4 className="text-xs font-bold text-slate-900 mb-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faq" className="py-24 px-6 bg-slate-50/60 border-t border-slate-100 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal-on-scroll">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Foire Aux Questions</h2>
            <p className="mt-2 text-slate-500 text-sm font-light">Toutes les réponses à vos interrogations sur la souscription et la sécurité.</p>
          </div>

          <div className="space-y-4 reveal-on-scroll reveal-delay-200">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm hover:border-slate-300 transition-all">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-[#FF7900] shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-white border-t border-slate-100 text-center relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src={orangeLogo} alt="Orange Logo" className="h-6 w-auto" />
            <span className="font-bold text-[#FF7900] font-mono">INOVA IRIS</span>
          </div>
          <p className="font-light">© {new Date().getFullYear()} INOVA-IRIS SOC. Direction de la Cybersécurité Sonatel. Tous droits réservés.</p>
        </div>
      </footer>

      {/* ========================================== */}
      {/* CHECKOUT WIZARD MODAL (PAYMENT PROCESSOR)  */}
      {/* ========================================== */}
      {/* ======================================================== */}
      {/* NOUVEAU FORMULAIRE DE SOUSCRIPTION MODERNE & PAYTECH UNIQUE */}
      {/* ======================================================== */}
      {showCheckoutModal && checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-scale-up">
            
            {/* Header Moderne & Épuré */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-zinc-900 text-white border-b border-orange-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-[#FF7900] text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold tracking-wide uppercase text-white">Souscription CyberSOC</h3>
                    <Badge className="bg-[#FF7900]/20 text-[#FF7900] border border-[#FF7900]/40 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                      PayTech SN
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-300 font-light mt-0.5">
                    Déploiement instantané pour votre organisation • Sonatel Cyberdéfense
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowCheckoutModal(false);
                  if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contenu de la Modal */}
            <div className="p-6 sm:p-8 max-h-[85vh] overflow-y-auto space-y-6">
              
              {checkoutStep !== "success" ? (
                <>
                  {/* Carte Récapitulative de la Formule Sélectionnée */}
                  <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-white border border-orange-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF7900] text-white px-2.5 py-0.5 rounded-full">
                          Formule Sélectionnée
                        </span>
                        <span className="text-xs font-semibold text-slate-500">Sans engagement</span>
                      </div>
                      <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                        {checkoutPlan.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-light">
                        Supervision SOC 24/7 • {checkoutPlan.maxPcs} agents EDR inclus • Détection & réponse
                      </p>
                    </div>

                    <div className="sm:text-right bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-orange-100 w-full sm:w-auto">
                      <span className="text-xs text-slate-500 font-medium block">Montant à régler</span>
                      <div className="text-2xl font-black text-slate-950 text-[#FF7900]">
                        {checkoutPlan.value.toLocaleString("fr-FR")} <span className="text-sm font-bold text-slate-600">FCFA/mois</span>
                      </div>
                    </div>
                  </div>

                  {/* Formulaire de Coordonnées */}
                  <form onSubmit={handleInitiatePaytech} className="space-y-5">
                    
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4 text-[#FF7900]" />
                        1. Informations sur votre organisation
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Entreprise */}
                        <div className="space-y-1.5">
                          <label htmlFor="compName" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Nom de l'entreprise / Structure *
                          </label>
                          <input 
                            id="compName"
                            type="text" 
                            required 
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Ex: SONATEL SA, INOVA, SARL..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all shadow-inner"
                          />
                        </div>

                        {/* Secteur */}
                        <div className="space-y-1.5">
                          <label htmlFor="secAct" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Secteur d'activité
                          </label>
                          <select
                            id="secAct"
                            value={businessSector}
                            onChange={(e) => setBusinessSector(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all"
                          >
                            <option value="Finance">Banque & Services Financiers</option>
                            <option value="Telecom">Télécommunications & Tech</option>
                            <option value="Health">Santé & Pharma</option>
                            <option value="Gov">Administrations Publiques</option>
                            <option value="Commerce">Commerce & Distribution</option>
                            <option value="Autre">Autre secteur d'activité</option>
                          </select>
                        </div>

                        {/* Nom du Responsable */}
                        <div className="space-y-1.5">
                          <label htmlFor="mgrName" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Nom complet du responsable *
                          </label>
                          <input 
                            id="mgrName"
                            type="text" 
                            required 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ex: Sanou Gueye"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all shadow-inner"
                          />
                        </div>

                        {/* Téléphone */}
                        <div className="space-y-1.5">
                          <label htmlFor="mgrPhone" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Téléphone mobile (Wave / OM) *
                          </label>
                          <input 
                            id="mgrPhone"
                            type="tel" 
                            required 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ex: 77 123 45 67"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                        {/* Email */}
                        <div className="space-y-1.5">
                          <label htmlFor="mgrEmail" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            E-mail professionnel (Identifiant SOC) *
                          </label>
                          <input 
                            id="mgrEmail"
                            type="email" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="contact@entreprise.sn"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all shadow-inner"
                          />
                        </div>

                        {/* Adresse */}
                        <div className="space-y-1.5">
                          <label htmlFor="mgrAddr" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                            Adresse / Ville *
                          </label>
                          <input 
                            id="mgrAddr"
                            type="text" 
                            required 
                            value={physicalAddress}
                            onChange={(e) => setPhysicalAddress(e.target.value)}
                            placeholder="Ex: VDN, Dakar, Sénégal"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-[#FF7900] focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section Mode de Paiement : EXCLUSIVEMENT PAYTECH */}
                    <div className="pt-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                        <CreditCard className="h-4 w-4 text-[#FF7900]" />
                        2. Mode de Règlement Sécurisé
                      </h4>

                      <div className="relative rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white border-2 border-orange-400/50 shadow-md">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5">
                            {/* Logo PayTech stylisé */}
                            <div className="h-12 w-20 bg-gradient-to-br from-[#FF7900] via-orange-600 to-amber-600 rounded-xl flex flex-col items-center justify-center text-white shadow-md border border-orange-400/30 shrink-0">
                              <span className="font-black text-xs tracking-tight">PAYTECH</span>
                              <span className="text-[6px] font-extrabold uppercase tracking-widest bg-white/20 px-1.5 rounded mt-0.5">SÉNÉGAL</span>
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-900">
                                  Passerelle Officielle PayTech
                                </span>
                                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-[9px] font-bold px-2 py-0.5">
                                  Agréé BCEAO
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-600 font-light mt-0.5">
                                Guichet unique sécurisé : Wave, Orange Money, Free Money, Wizall & Cartes Bancaires.
                              </p>
                            </div>
                          </div>

                          <div className="h-6 w-6 rounded-full bg-[#FF7900] text-white flex items-center justify-center shadow-sm shrink-0">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        </div>

                        {/* Badges des opérateurs intégrés */}
                        <div className="mt-3.5 pt-3 border-t border-orange-200/50 flex flex-wrap items-center gap-2 text-[10px] text-slate-600 font-medium">
                          <span className="text-slate-400 font-semibold">Moyens inclus au guichet :</span>
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">Wave</span>
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">Orange Money</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Free Money</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">Wizall</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">VISA / Mastercard</span>
                        </div>
                      </div>
                    </div>

                    {/* Message d'erreur éventuel ou lien direct */}
                    {paytechErrorDetails && (
                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs flex items-start gap-2.5">
                        <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-amber-800">Note de connexion PayTech :</p>
                          <p className="text-[11px] text-amber-700 leading-relaxed font-light">
                            {paytechErrorDetails}
                          </p>
                          <p className="text-[10px] text-amber-600 font-medium">
                            Vous pouvez réessayer la passerelle ou utiliser l'option d'activation immédiate ci-dessous pour continuer vos tests sans attendre.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Boutons d'Action */}
                    <div className="pt-2 space-y-2.5">
                      <Button 
                        type="submit"
                        disabled={isPaytechRedirecting}
                        className="w-full bg-gradient-to-r from-[#FF7900] via-orange-600 to-amber-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold text-sm h-12 rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                      >
                        {isPaytechRedirecting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                            <span>Ouverture du guichet PayTech SN en cours...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            <span>Payer {checkoutPlan.value.toLocaleString("fr-FR")} FCFA via PayTech</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {/* Lien de secours si redirection automatique différée */}
                      {paytechRedirectUrl && (
                        <a 
                          href={paytechRedirectUrl}
                          className="w-full text-center block text-xs font-bold text-[#FF7900] hover:underline p-1"
                        >
                          Cliquez ici si la redirection ne démarre pas automatiquement →
                        </a>
                      )}

                      {/* Option d'activation instantanée pour environnement de test */}
                      <div className="flex items-center justify-between pt-1">
                        <button 
                          type="button"
                          onClick={() => setShowCheckoutModal(false)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                        >
                          Annuler
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            if (!companyName.trim() || !email.trim()) {
                              toast.error("Veuillez saisir au minimum le nom de votre entreprise et votre email.");
                              return;
                            }
                            if (!generatedPassword) {
                              const pass = "INOVA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
                              setGeneratedPassword(pass);
                            }
                            const registeredUser = {
                              email,
                              password: generatedPassword || "INOVA-DEMO-2026",
                              fullName: fullName || "Responsable SOC",
                              companyName: companyName || "Entreprise Démo",
                              phone: phone || "77 000 00 00",
                              address: physicalAddress || "Dakar",
                              sector: businessSector,
                              planId: checkoutPlan.id,
                              planName: checkoutPlan.name,
                              paymentMethod: "PAYTECH"
                            };
                            localStorage.setItem("inova_registered_user", JSON.stringify(registeredUser));
                            setCheckoutStep("success");
                            toast.success("Abonnement activé avec succès en environnement test !");
                          }}
                          className="text-[11px] text-slate-400 hover:text-[#FF7900] font-semibold underline cursor-pointer transition-colors"
                        >
                          Valider directement l'accès (Accès Immédiat Test)
                        </button>
                      </div>
                    </div>

                  </form>
                </>
              ) : (
                /* ===================================== */
                /* ÉCRAN DE SUCCÈS & IDENTIFIANTS SOC    */
                /* ===================================== */
                <div className="space-y-6 text-center py-4 animate-scale-up">
                  <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="h-8 w-8" />
                  </div>

                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Abonnement Activé avec Succès !
                    </h3>
                    <p className="text-xs text-emerald-700 font-semibold mt-1">
                      Votre instance SOC pour la formule {checkoutPlan.name} est opérationnelle.
                    </p>
                  </div>

                  {/* Fiche des Identifiants Créés */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 text-left space-y-3.5 max-w-md mx-auto shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        <Send className="h-3.5 w-3.5 text-[#FF7900]" /> Identifiants de connexion SOC
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                        Actif
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div><strong className="font-semibold text-slate-700">Organisation :</strong> {companyName || "Non spécifié"}</div>
                      <div><strong className="font-semibold text-slate-700">Responsable :</strong> {fullName || "Contact"}</div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex justify-between items-center font-mono text-xs text-slate-800 shadow-inner">
                      <div className="space-y-1">
                        <div><strong className="font-semibold text-slate-500">Identifiant :</strong> {email}</div>
                        <div><strong className="font-semibold text-slate-500">Mot de passe :</strong> <span className="text-emerald-600 font-bold">{generatedPassword || "INOVA-SECURE-2026"}</span></div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          navigator.clipboard.writeText(generatedPassword || "INOVA-SECURE-2026");
                          toast.success("Mot de passe copié dans le presse-papiers !");
                        }} 
                        className="h-8 w-8 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer hover:bg-slate-100 shrink-0"
                        title="Copier le mot de passe"
                      >
                        <CheckSquare className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                      Vos accès ont également été envoyés à l'adresse <strong>{email}</strong>.
                    </p>
                  </div>

                  <Button 
                    onClick={handleAccessDashboard}
                    className="w-full max-w-md mx-auto bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-11 rounded-2xl cursor-pointer shadow-lg hover:scale-[1.01] transition-all"
                  >
                    Accéder à mon Espace Client CyberSOC →
                  </Button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
