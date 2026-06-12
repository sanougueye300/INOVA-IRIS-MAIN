import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, ArrowRight, Check, X, Shield, Lock, CreditCard,
  Phone, Smartphone, CheckCircle, RefreshCw, Cpu, Database, 
  Search, FolderOpen, Zap, Fingerprint, Eye, EyeOff, HelpCircle,
  Building2, MapPin, Briefcase, Mail, Send, CheckSquare, Sparkles,
  Loader2, ArrowRightCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { loadOffers, type Offer } from "@/lib/offers";
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

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"wave" | "om" | "card">("wave");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [omAuthCode, setOmAuthCode] = useState("");
  const [selectedBank, setSelectedBank] = useState("gim");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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

  const openCheckout = (plan: Offer) => {
    setCheckoutPlan(plan);
    setCheckoutStep("account");
    setShowCheckoutModal(true);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !fullName || !email || !phone || !physicalAddress) {
      toast.error("Veuillez renseigner toutes vos informations de compte.");
      return;
    }
    setCheckoutStep("method");
  };

  const handleSelectMethod = () => {
    setCheckoutStep("payment");
  };

  const sendSimulatedOtp = () => {
    setOtpSent(true);
    toast.success("Code OTP de vérification envoyé sur votre mobile !");
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "wave" && !paymentPhone) {
      toast.error("Veuillez renseigner votre numéro Wave.");
      return;
    }
    if (paymentMethod === "om" && (!paymentPhone || !omAuthCode)) {
      toast.error("Veuillez renseigner votre numéro et le code d'autorisation USSD.");
      return;
    }
    if (paymentMethod === "card" && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error("Veuillez remplir toutes les coordonnées de la carte.");
      return;
    }

    setCheckoutStep("processing");

    // Simulate auto-generation of password
    const pass = "INOVA-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedPassword(pass);

    setTimeout(() => {
      // Create user details in localStorage
      const registeredUser = {
        email: email,
        password: pass,
        fullName: fullName,
        companyName: companyName,
        phone: phone,
        address: physicalAddress,
        sector: businessSector,
        planId: checkoutPlan?.id,
        planName: checkoutPlan?.name
      };
      localStorage.setItem("inova_registered_user", JSON.stringify(registeredUser));
      setCheckoutStep("success");
      toast.success("Paiement validé ! Vos accès ont été configurés.");
    }, 3000);
  };

  const handleAccessDashboard = () => {
    // Log the user in locally by writing to inova_mock_user
    const mockSession = {
      id: "mock-uid-123",
      email: email,
      organization: companyName,
      user_metadata: { full_name: fullName }
    };
    localStorage.setItem("inova_mock_user", JSON.stringify(mockSession));
    
    // Close modal and navigate to dashboard
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

      {/* PLANS & SUBSCRIPTIONS SECTION - HIGHLY AESTHETIC HIGHLIGHT UPON CHOOSING / HOVERING */}
      <section id="offres" className="py-24 px-6 bg-white border-t border-slate-100 relative z-10">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 reveal-on-scroll">
            <Badge className="bg-[#FF7900]/10 text-[#FF7900] border-transparent font-bold text-[9px] tracking-wider uppercase px-3 py-1 rounded-full mb-3">
              SOUSCRIPTION SIMPLIFIÉE
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Nos Offres d'Abonnement</h2>
            <p className="mt-3 text-slate-500 text-sm font-light">
              Cliquez sur une offre pour lancer le test de validation de ressources SOC et configurer votre tenant de sécurité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-10 reveal-on-scroll reveal-delay-100">
            {offers.filter(o => o.isActive).map((plan) => {
              const active = selectedPlanId === plan.id;
              const validating = validatingPlanId === plan.id;
              const validated = validatedPlanId === plan.id;
              
              // Map accent styles based on active selection or plan tier
              let cardStyles = "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1.5 shadow-sm";
              let badgeText = "";
              let buttonClass = "bg-slate-100 text-slate-900 hover:bg-slate-200";

              if (active) {
                cardStyles = "border-[#FF7900] bg-white text-slate-900 shadow-2xl shadow-orange-500/10 ring-2 ring-orange-500/20 md:scale-[1.03]";
                buttonClass = "bg-[#FF7900] hover:bg-[#e06b00] text-white shadow-md shadow-orange-500/10";
                
                if (plan.theme === "blue") badgeText = "Le plus populaire";
                else if (plan.theme === "gold" || plan.theme === "slate") badgeText = "Premium Corporate";
                else badgeText = "Sélectionné";
              }

              // Apply special border glow animation when successfully validated
              if (validated) {
                cardStyles += " animate-border-orange";
              }

              // Gold base style override for card
              if (plan.theme === "gold" && !active) {
                cardStyles = "border-slate-800 bg-slate-900/5 text-slate-900 opacity-90 hover:shadow-lg hover:-translate-y-1";
              } else if (plan.theme === "gold" && active) {
                cardStyles = "border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-900/40 ring-2 ring-slate-800/30 md:scale-[1.03]";
                buttonClass = "bg-white text-slate-950 hover:bg-slate-100";
              }

              return (
                <div 
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`rounded-2xl border p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer relative overflow-hidden ${cardStyles}`}
                >
                  
                  {/* Cyber Scan Validation Overlay */}
                  {validating && (
                    <div className="absolute inset-0 bg-slate-950/95 rounded-2xl p-6 flex flex-col justify-between z-20 border border-orange-500 animate-fade-in font-mono text-[11px] text-slate-300 select-none">
                      {/* Laser scanner line */}
                      <div className="scan-laser pointer-events-none" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-505">
                          <span>SOC_PROVISIONING_AGENT</span>
                          <span className="animate-pulse text-orange-500">RUNNING</span>
                        </div>

                        <div className="space-y-3 mt-4">
                          {[
                            "Vérification ressources SOC...",
                            "Allocation EDR & Agent Wazuh...",
                            "Config playbooks SOAR/CTI...",
                            "Validation finale & signature..."
                          ].map((step, idx) => {
                            const isDone = currentValidationStep > idx;
                            const isCurrent = currentValidationStep === idx;
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                {isDone ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 stroke-[3]" />
                                ) : isCurrent ? (
                                  <Loader2 className="h-3.5 w-3.5 text-orange-500 animate-spin shrink-0" />
                                ) : (
                                  <div className="h-3.5 w-3.5 rounded-full border border-slate-700 shrink-0" />
                                )}
                                <span className={isDone ? "text-slate-400 line-through" : isCurrent ? "text-white font-bold" : "text-slate-600"}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>PROGRÈS CONFIG</span>
                          <span>{validationProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-1.5 transition-all duration-100" 
                            style={{ width: `${validationProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    
                    {/* Selected & Validated Indicators */}
                    {active && (
                      <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-fade-up">
                        {validating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] font-bold font-mono tracking-widest uppercase opacity-70">{plan.name}</span>
                      {badgeText && (
                        <Badge className={`${plan.theme === "gold" && active ? "bg-amber-400 text-slate-950" : "bg-orange-500 text-white"} font-bold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                          {badgeText}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">{plan.value.toLocaleString()}</span>
                      <span className="text-xs opacity-75 font-mono">{plan.currency} / {plan.period}</span>
                    </div>

                    <p className="text-xs opacity-80 leading-relaxed font-light mb-8">{plan.description}</p>

                    <div className="h-px bg-slate-200/30 my-6" />

                    <ul className="space-y-3.5 mb-8">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs font-light">
                          <Check className="h-4 w-4 text-[#FF7900] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {plan.mttd && (
                        <li className="flex items-start gap-2.5 text-xs font-light">
                          <Check className="h-4 w-4 text-[#FF7900] shrink-0 mt-0.5" />
                          <span>MTTD : <strong className="font-semibold">{plan.mttd}</strong></span>
                        </li>
                      )}
                      {plan.mttr && (
                        <li className="flex items-start gap-2.5 text-xs font-light">
                          <Check className="h-4 w-4 text-[#FF7900] shrink-0 mt-0.5" />
                          <span>MTTR : <strong className="font-semibold">{plan.mttr}</strong></span>
                        </li>
                      )}
                      {plan.support && (
                        <li className="flex items-start gap-2.5 text-xs font-light">
                          <Check className="h-4 w-4 text-[#FF7900] shrink-0 mt-0.5" />
                          <span>Support : <strong className="font-semibold">{plan.support}</strong></span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPlan(plan);
                    }}
                    className={`w-full font-bold text-xs py-3 h-11 rounded-full cursor-pointer transition-all ${buttonClass}`}
                  >
                    {validating ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="h-4.5 w-4.5 animate-spin" /> Validation...
                      </span>
                    ) : validated ? (
                      <span className="flex items-center gap-1 justify-center text-emerald-500 font-bold animate-fade-in">
                        <Check className="h-4 w-4" /> Offre validée !
                      </span>
                    ) : (
                      "Sélectionner & Valider"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* ELEGANT SLIDING RECUPERATION BAR FOR CHECOUT (VALIDATION FLOW) */}
          {selectedPlanId && (
            <div className="sticky bottom-4 z-30 max-w-3xl mx-auto mt-8 animate-fade-up">
              <div className="bg-slate-900 text-white rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-[#FF7900]">
                    <ShieldCheck className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">Choix actuel</span>
                    <h4 className="text-xs font-bold">
                      {offers.find(o => o.id === selectedPlanId)?.name} —{" "}
                      <span className="text-[#FF7900] font-mono">
                        {offers.find(o => o.id === selectedPlanId)?.value.toLocaleString()} FCFA
                      </span>
                    </h4>
                  </div>
                </div>

                <Button 
                  onClick={() => {
                    const chosen = offers.find(o => o.id === selectedPlanId);
                    if (chosen) openCheckout(chosen);
                  }}
                  className="bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-10 px-6 rounded-full cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/10 animate-pulse-soft"
                >
                  Continuer vers l'inscription <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
      {showCheckoutModal && checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#FF7900]">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wide">Souscription Sécurisée</h3>
                  <span className="text-[10px] font-mono font-semibold text-slate-500">{checkoutPlan.name} — SOC Tenant</span>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200/40 text-slate-500 hover:text-slate-950 hover:bg-slate-200 transition-all flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[500px]">
              
              {/* Visual Step-by-Step Stepper */}
              <div className="flex items-center justify-between mb-8 px-2 relative">
                {/* Line connecting the steps */}
                <div className="absolute top-[18px] left-[10%] right-[10%] h-[2px] bg-slate-100 -z-10" />
                <div 
                  className="absolute top-[18px] left-[10%] h-[2px] bg-orange-500 transition-all duration-300 -z-10" 
                  style={{ 
                    width: 
                      checkoutStep === "account" ? "0%" :
                      checkoutStep === "method" ? "33%" :
                      checkoutStep === "payment" || checkoutStep === "processing" ? "66%" : "100%"
                  }} 
                />

                {[
                  { key: "account", label: "Client", num: 1 },
                  { key: "method", label: "Paiement", num: 2 },
                  { key: "payment", label: "Validation", num: 3 },
                  { key: "success", label: "Accès", num: 4 }
                ].map((s, idx) => {
                  const isCurrent = s.key === checkoutStep || (checkoutStep === "processing" && s.key === "payment");
                  
                  let isCompleted = false;
                  if (checkoutStep === "method" && idx < 1) isCompleted = true;
                  if (checkoutStep === "payment" && idx < 2) isCompleted = true;
                  if (checkoutStep === "processing" && idx < 3) isCompleted = true;
                  if (checkoutStep === "success") isCompleted = true;

                  return (
                    <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1 relative z-10 select-none">
                      <div 
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                          isCompleted && checkoutStep !== "success"
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                            : isCurrent 
                              ? "bg-[#FF7900] border-[#FF7900] text-white shadow-[0_0_12px_rgba(255,121,0,0.3)] scale-110" 
                              : "bg-white border-slate-200 text-slate-400"
                        }`}
                      >
                        {isCompleted && checkoutStep !== "success" ? (
                          <Check className="h-4 w-4 stroke-[3]" />
                        ) : (
                          s.num
                        )}
                      </div>
                      <span 
                        className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                          isCurrent ? "text-slate-900" : isCompleted && checkoutStep !== "success" ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: ACCOUNT DETAILS FORM (NO PASSWORD INPUT AS REQUESTED) */}
              {checkoutStep === "account" && (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="text-center mb-6">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Informations de Facturation</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Saisissez les coordonnées de votre entreprise. Aucun mot de passe n'est requis.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="company">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> Nom de l'entreprise
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        id="company" 
                        type="text" 
                        required 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="adminName">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400" /> Nom complet du gérant / contact
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        id="adminName" 
                        type="text" 
                        required 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="adminEmail">
                      <Mail className="h-3.5 w-3.5 text-slate-400" /> Adresse e-mail de réception
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        id="adminEmail" 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="adminPhone">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> Numéro de téléphone professionnel
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        id="adminPhone" 
                        type="tel" 
                        required 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="adminAddress">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> Adresse physique de l'entreprise
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input 
                        id="adminAddress" 
                        type="text" 
                        required 
                        value={physicalAddress}
                        onChange={(e) => setPhysicalAddress(e.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/30 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="businessSector">
                      Secteur d'activité
                    </label>
                    <select
                      id="businessSector"
                      value={businessSector}
                      onChange={(e) => setBusinessSector(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/30 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-[#FF7900] focus:bg-white transition-all"
                    >
                      <option value="Finance">Banque & Services Financiers</option>
                      <option value="Telecom">Télécommunications & Tech</option>
                      <option value="Health">Santé & Pharma</option>
                      <option value="Gov">Administrations Publiques</option>
                      <option value="Commerce">Commerce & Distribution</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-11 rounded-full mt-6 cursor-pointer shadow-md shadow-orange-500/10 hover:scale-[1.01] transition-all">
                    Continuer vers le paiement
                  </Button>
                </form>
              )}

              {/* STEP 2: METHOD SELECTION */}
              {checkoutStep === "method" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Moyen de Règlement</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Sélectionnez le service avec lequel valider votre transaction.</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { 
                        id: "wave", 
                        label: "Wave Sénégal", 
                        desc: "Confirmation instantanée sur mobile", 
                        colorClass: "active:scale-[0.99] border-sky-100 hover:border-sky-300",
                        activeColorClass: "border-sky-500 bg-sky-50/40 ring-1 ring-sky-500",
                        logo: (
                          <div className="h-9 w-14 bg-gradient-to-r from-sky-400 to-blue-500 rounded-lg flex flex-col items-center justify-center text-white shadow-sm">
                            <span className="font-black text-[9px] tracking-tight">WAVE</span>
                            <span className="text-[5px] uppercase font-bold tracking-widest opacity-80">SÉNÉGAL</span>
                          </div>
                        )
                      },
                      { 
                        id: "om", 
                        label: "Orange Money", 
                        desc: "Validation sécurisée par code USSD", 
                        colorClass: "active:scale-[0.99] border-orange-100 hover:border-orange-300",
                        activeColorClass: "border-orange-500 bg-orange-50/40 ring-1 ring-orange-500",
                        logo: (
                          <div className="h-9 w-14 bg-gradient-to-r from-[#FF7900] to-amber-500 rounded-lg flex flex-col items-center justify-center text-white shadow-sm">
                            <span className="font-extrabold text-[10px]">OM</span>
                            <span className="text-[5px] uppercase font-bold tracking-widest opacity-80">PARTNER</span>
                          </div>
                        )
                      },
                      { 
                        id: "card", 
                        label: "Carte Bancaire / Banque", 
                        desc: "Visa, Mastercard & Banques locales", 
                        colorClass: "active:scale-[0.99] border-slate-100 hover:border-slate-300",
                        activeColorClass: "border-slate-800 bg-slate-50/60 ring-1 ring-slate-800",
                        logo: (
                          <div className="h-9 w-14 bg-gradient-to-r from-slate-800 to-slate-950 rounded-lg flex flex-col items-center justify-center text-white shadow-sm border border-slate-700">
                            <span className="font-bold text-[8px] tracking-widest">VISA</span>
                            <span className="text-[5px] font-mono tracking-tighter opacity-85">•••• 4000</span>
                          </div>
                        )
                      }
                    ].map((method) => {
                      const active = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setPaymentMethod(method.id as any)}
                          className={`w-full text-left p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            active ? method.activeColorClass : method.colorClass + " border-slate-100 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-4.5">
                            {method.logo}
                            <div>
                              <span className="text-xs font-bold block text-slate-800">{method.label}</span>
                              <span className="text-[9px] text-slate-400 font-light mt-0.5 block">{method.desc}</span>
                            </div>
                          </div>
                          
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                            active 
                              ? paymentMethod === "wave" ? "border-sky-500 bg-sky-500" : paymentMethod === "om" ? "border-orange-500 bg-[#FF7900]" : "border-slate-800 bg-slate-800" 
                              : "border-slate-200 bg-white"
                          }`}>
                            {active && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setCheckoutStep("account")} className="flex-1 rounded-full border-slate-200 h-10 text-xs cursor-pointer">
                      Retour
                    </Button>
                    <Button onClick={handleSelectMethod} className="flex-1 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-10 rounded-full cursor-pointer shadow-sm">
                      Valider la méthode
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION DETAILS */}
              {checkoutStep === "payment" && (
                <form onSubmit={handleConfirmPayment} className="space-y-6">
                  <div className="text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Règlement sécurisé par {paymentMethod === "wave" ? "Wave" : paymentMethod === "om" ? "Orange Money" : "Carte Bancaire"}
                    </h4>
                    <span className="text-lg font-mono font-extrabold text-[#FF7900] block mt-1">
                      {checkoutPlan.value.toLocaleString()} FCFA
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 block">TVA & Taxes incluses</span>
                  </div>

                  {paymentMethod === "wave" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/20 text-center flex flex-col items-center">
                        <div className="h-8 w-16 bg-sky-500 rounded-md flex items-center justify-center text-white font-black text-[10px] tracking-wide mb-2">
                          WAVE
                        </div>
                        <p className="text-[10px] text-sky-700 font-light leading-relaxed max-w-xs">
                          Saisissez votre numéro Wave. Une notification push de facturation instantanée sera transmise à votre application mobile.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="wavePhone">Numéro de téléphone Wave</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            id="wavePhone" 
                            type="tel" 
                            required 
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      {paymentPhone && !otpSent && (
                        <Button type="button" onClick={sendSimulatedOtp} variant="outline" className="w-full h-10 rounded-full text-xs border-sky-200 text-sky-600 hover:bg-sky-50/40 cursor-pointer transition-all">
                          Générer le code OTP
                        </Button>
                      )}

                      {otpSent && (
                        <div className="space-y-1.5 animate-fade-in">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="waveOtp">Code de validation OTP (simulé)</label>
                          <input 
                            id="waveOtp" 
                            type="text" 
                            required 
                            maxLength={4}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === "om" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 text-center flex flex-col items-center">
                        <div className="h-8 w-8 bg-[#FF7900] rounded-md flex items-center justify-center text-white font-extrabold text-[12px] mb-2">
                          OM
                        </div>
                        <p className="text-[10px] text-orange-700 font-light leading-relaxed max-w-xs">
                          Saisissez votre numéro Orange Money. Composez ensuite le <strong className="font-bold">#144#39#</strong> sur votre mobile pour générer un code d'autorisation temporaire.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="omPhone">Numéro de téléphone Orange</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            id="omPhone" 
                            type="tel" 
                            required 
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="omAuth">Code d'autorisation (obtenu via #144#)</label>
                        <input 
                          id="omAuth" 
                          type="text" 
                          required 
                          maxLength={6}
                          value={omAuthCode}
                          onChange={(e) => setOmAuthCode(e.target.value)}
                          placeholder=""
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-4 animate-fade-in">
                      
                      {/* Interactive Credit Card Widget Mockup */}
                      <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden h-36 flex flex-col justify-between font-mono max-w-sm mx-auto select-none border border-slate-700">
                        {/* Glow spot */}
                        <div className="absolute top-0 right-0 w-28 h-28 bg-[#FF7900]/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex justify-between items-start">
                          <span className="text-[8px] tracking-widest text-slate-400 uppercase">INOVA IRIS PARTNER BANK</span>
                          <div className="text-[9px] px-2 py-0.5 rounded bg-white/10 uppercase font-bold text-slate-200">
                            {SENEGAL_BANKS.find(b => b.id === selectedBank)?.name.split(" ")[0] || "CARD"}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm tracking-[0.2em] font-bold text-slate-100 my-2">
                          {cardNumber || "•••• •••• •••• ••••"}
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                          <div>
                            <span className="text-[7px] text-slate-500 block uppercase">Titulaire</span>
                            <span className="font-semibold tracking-wide uppercase text-slate-200 truncate max-w-[150px] block">
                              {cardHolder || "Moustapha Diop"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[7px] text-slate-500 block uppercase">Expire</span>
                            <span className="font-semibold text-slate-200">{cardExpiry || "MM/AA"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Local Bank Partner Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Choisir votre banque de paiement</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                        >
                          {SENEGAL_BANKS.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="cardHolder">
                          Nom complet du titulaire
                        </label>
                        <input 
                          id="cardHolder" 
                          type="text" 
                          required 
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder=""
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5" htmlFor="cardNumber">
                          Numéro de carte bancaire
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            id="cardNumber" 
                            type="text" 
                            required 
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 pl-10 pr-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardExpiry">Expiration</label>
                          <input 
                            id="cardExpiry" 
                            type="text" 
                            required 
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardCvv">CVV</label>
                          <input 
                            id="cardCvv" 
                            type="password" 
                            required 
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder=""
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/20 px-3.5 py-2.5 text-xs text-center font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF7900] focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCheckoutStep("method")} className="flex-1 rounded-full border-slate-200 h-10 text-xs cursor-pointer">
                      Retour
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-10 rounded-full cursor-pointer shadow-md shadow-orange-500/10 hover:scale-[1.01] transition-all">
                      Confirmer le paiement
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 4: PROCESSING TRANSACTION */}
              {checkoutStep === "processing" && (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-pulse-soft">
                  <div className="relative h-14 w-14 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-orange-500/10 border-t-orange-500 animate-spin" />
                    <Shield className="h-6 w-6 text-[#FF7900]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Traitement de votre règlement...</h4>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">
                      Veuillez patienter pendant la validation de la transaction avec votre opérateur. Ne fermez pas cette fenêtre.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 5: SUCCESS & ACCÈS GATEWAY */}
              {checkoutStep === "success" && (
                <div className="space-y-6 text-center py-2 animate-scale-up">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="h-6 w-6 animate-pulse" />
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Abonnement Activé avec Succès !</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">Transaction validée par {paymentMethod.toUpperCase()}</p>
                  </div>

                  {/* Simulated Mail Container */}
                  <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 text-left space-y-3 max-w-sm mx-auto shadow-sm text-xs font-sans">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 text-[9px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <Send className="h-3 w-3 text-[#FF7900]" /> E-mail de bienvenue envoyé
                      </span>
                      <span>À l'instant</span>
                    </div>

                    <div className="space-y-0.5 text-[10px] text-slate-500">
                      <div><strong className="font-semibold text-slate-600">De :</strong> Direction Cybersécurité Sonatel &lt;soc@sonatel.sn&gt;</div>
                      <div><strong className="font-semibold text-slate-600">À :</strong> {email}</div>
                      <div><strong className="font-semibold text-slate-600">Objet :</strong> Vos accès de connexion à la plateforme INOVA IRIS</div>
                    </div>

                    <div className="h-px bg-slate-200/40 my-1" />

                    <div className="text-[10px] text-slate-600 space-y-2 leading-relaxed">
                      <p>Bonjour {fullName},</p>
                      <p>Nous vous confirmons l'activation de votre abonnement <strong>{checkoutPlan.name}</strong> pour l'entreprise <strong>{companyName}</strong>.</p>
                      
                      <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center font-mono text-[9px] text-slate-800 shadow-sm">
                        <div className="space-y-1">
                          <div><strong className="font-semibold">Lien SOC :</strong> <span className="text-[#FF7900] underline">https://inova.sonatel.sn/login</span></div>
                          <div><strong className="font-semibold">Identifiant :</strong> {email}</div>
                          <div><strong className="font-semibold">Mot de passe :</strong> <span className="text-emerald-600 font-bold">{generatedPassword}</span></div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedPassword);
                            toast.success("Mot de passe copié dans le presse-papiers !");
                          }} 
                          className="h-7 w-7 text-slate-400 hover:text-slate-900 rounded-full cursor-pointer hover:bg-slate-50 shrink-0"
                          title="Copier le mot de passe"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      <p className="text-[8px] text-slate-400">Ce message automatique contient des clés réseau confidentielles. Veuillez modifier votre mot de passe dès votre première connexion.</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
                    Copiez le mot de passe ci-dessus, puis cliquez sur le bouton ci-dessous pour accéder directement à votre interface client.
                  </p>

                  <Button 
                    onClick={handleAccessDashboard}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-11 rounded-full cursor-pointer shadow-md hover:scale-[1.01] transition-all"
                  >
                    Accéder à mon Espace Client
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
