import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, ArrowRight, Check, X, Shield, Lock, CreditCard,
  Phone, Smartphone, CheckCircle, RefreshCw, Cpu, Database, 
  Search, FolderOpen, Zap, Fingerprint, Eye, EyeOff, HelpCircle,
  Building2, MapPin, Briefcase, Mail, Send, CheckSquare, Sparkles
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
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

    // Simulate auto-generation of password: ex: INOVA-9F2D-81E4
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
    <div className="bg-[#ffffff] text-slate-900 min-h-screen font-sans" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      {/* HEADER SECTION - EXACT REPRODUCTION OF DELICUT BAR */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
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

      {/* HERO SECTION - INCORPORATING PLATFORM LOGO DIRECTLY ABOVE HERO TITLE */}
      <section className="relative py-20 md:py-32 px-6 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Integrated Platform Logo above the title */}
          <div className="flex items-center gap-3 bg-white border border-slate-200/60 rounded-2xl px-5 py-2.5 shadow-sm mb-6 animate-fade-in hover:scale-105 transition-all">
            <img src={orangeLogo} alt="Orange Logo" className="h-7 w-auto object-contain" />
            <div className="h-5 w-px bg-slate-200" />
            <span className="font-extrabold text-[15px] tracking-wider text-[#FF7900] font-mono">INOVA IRIS</span>
            <Badge className="bg-orange-500 text-white font-bold text-[8px] tracking-widest uppercase rounded">SOC</Badge>
          </div>

          {/* Headline exactly matching the typography proportions */}
          <h1 className="text-4xl sm:text-[68px] leading-[1.08] font-extrabold tracking-tight text-slate-950 max-w-3xl">
            La Solution de Cyberdéfense
            <span className="block text-[#64748b] font-medium mt-1">
              Souveraine & Idéale
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-8 text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed font-light">
            Détectez et neutralisez les cybermenaces en temps réel. Souscrivez en ligne via Wave ou Orange Money et accédez à votre console SOC instantanément.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex gap-4">
            <a 
              href="#offres" 
              className="bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs px-8 py-3 rounded-full transition-all shadow-md shadow-orange-500/10 hover:scale-[1.02]"
            >
              Voir les Abonnements
            </a>
            <Link 
              to="/workflow" 
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-6 py-3 rounded-full transition-all"
            >
              Découvrir les Fonctionnalités
            </Link>
          </div>
        </div>
      </section>

      {/* PLANS & SUBSCRIPTIONS SECTION - HIGHLY AESTHETIC HIGHLIGHT UPON CHOOSING / HOVERING */}
      <section id="offres" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Nos Offres d'Abonnement</h2>
            <p className="mt-3 text-slate-500 text-sm font-light">Cliquez sur un plan pour le sélectionner visuellement avant de souscrire.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {offers.filter(o => o.isActive).map((plan) => {
              const active = selectedPlanId === plan.id;
              
              // Map accent styles based on active selection or plan tier
              let cardStyles = "border-slate-200 bg-white text-slate-900 scale-95 opacity-80 hover:opacity-100";
              let badgeText = "";
              let buttonClass = "bg-slate-100 text-slate-900 hover:bg-slate-200";

              if (active) {
                cardStyles = "border-[#FF7900] bg-white text-slate-900 scale-[1.03] shadow-2xl shadow-orange-500/10 ring-2 ring-orange-500/20";
                buttonClass = "bg-[#FF7900] hover:bg-[#e06b00] text-white shadow-md shadow-orange-500/10";
                
                if (plan.theme === "blue") badgeText = "Le plus populaire";
                else if (plan.theme === "gold" || plan.theme === "slate") badgeText = "Premium Corporate";
                else badgeText = "Sélectionné";
              }

              // Gold base style override for card
              if (plan.theme === "gold" && !active) {
                cardStyles = "border-slate-800 bg-slate-900/5 text-slate-900 opacity-90 scale-95";
              } else if (plan.theme === "gold" && active) {
                cardStyles = "border-slate-900 bg-slate-950 text-white scale-[1.03] shadow-2xl shadow-slate-900/40 ring-2 ring-slate-800/30";
                buttonClass = "bg-white text-slate-950 hover:bg-slate-100";
              }

              return (
                <div 
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`rounded-2xl border p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer ${cardStyles}`}
                >
                  <div className="relative">
                    
                    {/* Selected Indicator Checkmark */}
                    {active && (
                      <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
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
                      e.stopPropagation(); // Avoid double click triggers
                      openCheckout(plan);
                    }}
                    className={`w-full font-bold text-xs py-3 h-11 rounded-full cursor-pointer transition-all ${buttonClass}`}
                  >
                    Choisir cette offre
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SERVICES SOC BRICKS SECTION */}
      <section id="services" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Une Architecture SOC Intégrée</h2>
            <p className="mt-3 text-slate-500 text-sm font-light">La puissance des meilleurs outils open source unifiés sous une couche d'automatisation.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
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
      <section id="pourquoi" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-transparent font-bold text-[9px] tracking-wider uppercase px-3 py-1 rounded-full mb-6">
            sécurité souveraine
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Pourquoi choisir INOVA-IRIS ?</h2>
          <p className="mt-4 text-sm text-slate-500 leading-relaxed font-light max-w-xl mx-auto">
            INOVA-IRIS garantit que l'ensemble des journaux d'activité et des audits de sécurité de votre structure ne transitent pas hors du territoire national. Toutes vos données sont hébergées et traitées localement au Sénégal par les experts SecOps de Sonatel.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 text-left">
            {[
              { title: "Résidence Locale", desc: "Zéro export de données réseau hors du Sénégal." },
              { title: "Paiement Simple", desc: "Wave, Orange Money et Cartes pris en charge localement." },
              { title: "Accès Instantané", desc: "Compte opérationnel dès la validation du paiement." }
            ].map((item, idx) => (
              <div key={idx} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50">
                <CheckCircle className="h-5 w-5 text-emerald-500 mb-3" />
                <h4 className="text-xs font-bold text-slate-900 mb-1">{item.title}</h4>
                <p className="text-[11px] text-slate-500 font-light leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faq" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">Foire Aux Questions</h2>
            <p className="mt-2 text-slate-500 text-sm font-light">Toutes les réponses à vos interrogations sur la souscription et la sécurité.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white border border-slate-200/60 rounded-xl p-6 shadow-sm">
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
      <footer className="py-16 px-6 bg-white border-t border-slate-100 text-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-950">Souscription à INOVA-IRIS</h3>
                <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">{checkoutPlan.name}</span>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200/40 text-slate-500 hover:text-slate-950 hover:bg-slate-200 transition-colors flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[460px]">
              
              {/* Progress Steps Indicators */}
              <div className="flex justify-between items-center mb-6">
                {[
                  { key: "account", label: "Client" },
                  { key: "method", label: "Moyen" },
                  { key: "payment", label: "Validation" },
                  { key: "success", label: "Accès" }
                ].map((s, idx) => {
                  let status = "text-slate-300";
                  if (s.key === checkoutStep) status = "text-[#FF7900] font-bold";
                  if (
                    (checkoutStep === "method" && idx === 0) ||
                    (checkoutStep === "payment" && idx <= 1) ||
                    (checkoutStep === "processing" && idx <= 2) ||
                    (checkoutStep === "success" && idx <= 3)
                  ) status = "text-emerald-500 font-semibold";

                  return (
                    <div key={s.key} className="flex items-center gap-1.5 text-[10px] font-mono uppercase">
                      <span>{s.label}</span>
                      {idx < 3 && <span className="text-slate-300">/</span>}
                    </div>
                  );
                })}
              </div>

              {/* STEP 1: ACCOUNT DETAILS FORM (NO PASSWORD INPUT AS REQUESTED) */}
              {checkoutStep === "account" && (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="text-center mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Informations de Facturation</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Vos identifiants de sécurité vous seront générés et envoyés par e-mail.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1" htmlFor="company">
                      <Building2 className="h-3 w-3 text-slate-400" /> Nom de l'entreprise
                    </label>
                    <input 
                      id="company" 
                      type="text" 
                      required 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Sonatel SA"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1" htmlFor="adminName">
                      <Briefcase className="h-3 w-3 text-slate-400" /> Nom complet du gérant / contact
                    </label>
                    <input 
                      id="adminName" 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Moustapha Diop"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1" htmlFor="adminEmail">
                      <Mail className="h-3 w-3 text-slate-400" /> Adresse e-mail (Pour réception des accès)
                    </label>
                    <input 
                      id="adminEmail" 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: contact@entreprise.sn"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1" htmlFor="adminPhone">
                      <Phone className="h-3 w-3 text-slate-400" /> Numéro de téléphone professionnel
                    </label>
                    <input 
                      id="adminPhone" 
                      type="tel" 
                      required 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: +221 77 123 45 67"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1" htmlFor="adminAddress">
                      <MapPin className="h-3 w-3 text-slate-400" /> Adresse physique de l'entreprise
                    </label>
                    <input 
                      id="adminAddress" 
                      type="text" 
                      required 
                      value={physicalAddress}
                      onChange={(e) => setPhysicalAddress(e.target.value)}
                      placeholder="Ex: Route de la VDN, Mermoz, Dakar"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="businessSector">Secteur d'activité</label>
                    <select
                      id="businessSector"
                      value={businessSector}
                      onChange={(e) => setBusinessSector(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="Finance">Banque & Services Financiers</option>
                      <option value="Telecom">Télécommunications & Tech</option>
                      <option value="Health">Santé & Pharma</option>
                      <option value="Gov">Administrations Publiques</option>
                      <option value="Commerce">Commerce & Distribution</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-10 rounded-full mt-6 cursor-pointer shadow-md">
                    Continuer vers le paiement
                  </Button>
                </form>
              )}

              {/* STEP 2: METHOD SELECTION WITH APPROPRIATE LOGOS */}
              {checkoutStep === "method" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Moyen de Règlement</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Sélectionnez le service avec lequel valider votre transaction.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { 
                        id: "wave", 
                        label: "Wave Sénégal", 
                        desc: "Confirmation instantanée", 
                        logo: (
                          <div className="h-6 w-12 bg-sky-500 rounded flex items-center justify-center text-white font-black text-[9px] tracking-tight">
                            WAVE
                          </div>
                        )
                      },
                      { 
                        id: "om", 
                        label: "Orange Money", 
                        desc: "Validation par code USSD", 
                        logo: (
                          <div className="h-6 w-6 bg-[#FF7900] rounded flex items-center justify-center text-white font-extrabold text-[10px]">
                            OM
                          </div>
                        )
                      },
                      { 
                        id: "card", 
                        label: "Carte Bancaire / Banque", 
                        desc: "Visa, Mastercard & Banques locales", 
                        logo: (
                          <div className="h-6 w-10 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-[8px]">
                            CARD
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
                            active 
                              ? "border-[#FF7900] bg-orange-500/5 shadow-sm ring-1 ring-orange-500" 
                              : "border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {method.logo}
                            <div>
                              <span className="text-xs font-bold block">{method.label}</span>
                              <span className="text-[9px] text-slate-400 font-light mt-0.5 block">{method.desc}</span>
                            </div>
                          </div>
                          
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${active ? "border-[#FF7900] bg-[#FF7900]" : "border-slate-300"}`}>
                            {active && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={() => setCheckoutStep("account")} className="flex-1 rounded-full border-slate-200 h-10 text-xs">
                      Retour
                    </Button>
                    <Button onClick={handleSelectMethod} className="flex-1 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-10 rounded-full cursor-pointer shadow-sm">
                      Valider la méthode
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION DETAILS WITH BANK SELECTION OR TELEPHONE */}
              {checkoutStep === "payment" && (
                <form onSubmit={handleConfirmPayment} className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Règlement par {paymentMethod === "wave" ? "Wave" : paymentMethod === "om" ? "Orange Money" : "Carte Bancaire"}
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-900 block mt-1">Montant à régler : {checkoutPlan.value.toLocaleString()} FCFA</span>
                  </div>

                  {paymentMethod === "wave" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 text-center flex flex-col items-center">
                        <div className="h-8 w-16 bg-sky-500 rounded flex items-center justify-center text-white font-black text-[10px] tracking-wide mb-2">
                          WAVE
                        </div>
                        <p className="text-[10px] text-blue-700 font-light leading-relaxed">
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
                            placeholder="Ex: 77 123 45 67"
                            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {paymentPhone && !otpSent && (
                        <Button type="button" onClick={sendSimulatedOtp} variant="outline" className="w-full h-9 rounded-full text-xs border-blue-200 text-blue-600 hover:bg-blue-50/40">
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
                            placeholder="Entrez les 4 chiffres reçus"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-center font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === "om" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/20 text-center flex flex-col items-center">
                        <div className="h-8 w-8 bg-[#FF7900] rounded flex items-center justify-center text-white font-extrabold text-[12px] mb-2">
                          OM
                        </div>
                        <p className="text-[10px] text-orange-700 font-light leading-relaxed">
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
                            placeholder="Ex: 77 123 45 67"
                            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                          placeholder="Ex: 104829"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-center font-mono tracking-widest focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-3.5">
                      
                      {/* Local Bank Partner Selector */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Choisir votre banque de paiement</label>
                        <select
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {SENEGAL_BANKS.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardName">Nom complet du titulaire</label>
                        <input 
                          id="cardName" 
                          type="text" 
                          required 
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Ex: Moustapha Diop"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardNumber">Numéro de carte bancaire</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input 
                            id="cardNumber" 
                            type="text" 
                            required 
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="4000 1234 5678 9010"
                            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardExp">Expiration</label>
                          <input 
                            id="cardExp" 
                            type="text" 
                            required 
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/AA"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="cardVal">Cryptogramme CVV</label>
                          <input 
                            id="cardVal" 
                            type="password" 
                            required 
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="•••"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setCheckoutStep("method")} className="flex-1 rounded-full border-slate-200 h-10 text-xs">
                      Retour
                    </Button>
                    <Button type="submit" className="flex-1 bg-[#FF7900] hover:bg-[#e06b00] text-white font-bold text-xs h-10 rounded-full cursor-pointer shadow-md">
                      Confirmer le paiement
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 4: PROCESSING TRANSACTION */}
              {checkoutStep === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw className="h-10 w-10 text-[#FF7900] animate-spin" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Traitement de votre règlement...</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                      Veuillez patienter pendant la validation de la transaction avec votre opérateur. Ne fermez pas cette fenêtre.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 5: SUCCESS & ACCÈS GATEWAY WITH DYNAMIC MOCK EMAIL */}
              {checkoutStep === "success" && (
                <div className="space-y-6 text-center py-2">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-inner animate-scale-up">
                    <ShieldCheck className="h-6 w-6 animate-pulse" />
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Abonnement Activé avec Succès !</h3>
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">Transaction validée par {paymentMethod.toUpperCase()}</p>
                  </div>

                  {/* simulated mail container */}
                  <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto shadow-inner text-xs font-sans">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <Send className="h-2.5 w-2.5 text-[#FF7900]" /> E-mail de bienvenue envoyé
                      </span>
                      <span>À l'instant</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500"><strong className="font-semibold text-slate-600">De :</strong> Direction Cybersécurité Sonatel &lt;soc@sonatel.sn&gt;</div>
                      <div className="text-[10px] text-slate-500"><strong className="font-semibold text-slate-600">À :</strong> {email}</div>
                      <div className="text-[10px] text-slate-500"><strong className="font-semibold text-slate-600">Objet :</strong> Vos accès de connexion à la plateforme INOVA IRIS</div>
                    </div>

                    <div className="h-px bg-slate-200/50 my-1" />

                    <div className="text-[10px] text-slate-600 space-y-2 leading-relaxed">
                      <p>Bonjour {fullName},</p>
                      <p>Nous vous confirmons l'activation de votre abonnement <strong>{checkoutPlan.name}</strong> pour l'entreprise <strong>{companyName}</strong>.</p>
                      
                      <div className="bg-white border border-slate-200 rounded-lg p-2.5 font-mono text-[9px] space-y-1 text-slate-800">
                        <div><strong className="font-semibold">Lien SOC :</strong> <span className="text-[#FF7900] underline">https://inova.sonatel.sn/login</span></div>
                        <div><strong className="font-semibold">Identifiant :</strong> {email}</div>
                        <div><strong className="font-semibold">Mot de passe :</strong> <span className="text-emerald-600 font-bold">{generatedPassword}</span></div>
                      </div>
                      
                      <p className="text-[8px] text-slate-400">Ce message automatique contient des clés réseau confidentielles. Veuillez modifier votre mot de passe dès votre première connexion.</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
                    Copiez le mot de passe ci-dessus, puis cliquez sur le bouton ci-dessous pour accéder directement à votre interface client.
                  </p>

                  <Button 
                    onClick={handleAccessDashboard}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs h-10 rounded-full cursor-pointer shadow-md"
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
