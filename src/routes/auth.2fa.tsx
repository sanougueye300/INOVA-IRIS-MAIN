import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { RefreshCw, Mail, ShieldCheck, MessageSquare, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  complete2FAAndRedirect,
  getOtpMeta,
  isPending2FA,
  sendLoginSmsOtp,
  verifyLogin2FA,
} from "@/lib/auth-security";

export const Route = createFileRoute("/auth/2fa")({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [otpChannel, setOtpChannel] = useState<"sms" | "email">("sms");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [customPhone, setCustomPhone] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isPending2FA()) {
      navigate({ to: "/auth/login", replace: true });
      return;
    }

    const meta = getOtpMeta();
    if (meta) {
      setMaskedPhone(meta.maskedPhone);
      setOtpChannel(meta.otpChannel ?? "sms");
      const elapsed = Math.floor((Date.now() - meta.sentAt) / 1000);
      setSecondsLeft(Math.max(0, meta.expiresInSeconds - elapsed));

      if (meta.devOtp) {
        toast.info("Code de secours SOC généré", {
          description: `Votre code OTP 2FA temporaire est : ${meta.devOtp}`,
          duration: 15000,
        });
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const handleInputChange = (value: string, idx: number) => {
    if (/[^0-9]/.test(value)) return;
    const nextCode = [...code];
    nextCode[idx] = value.slice(-1);
    setCode(nextCode);
    if (value && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (nextCode.every((c) => c !== "") && nextCode.length === 6) {
      handleVerifySms(nextCode.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const nextCode = Array(6).fill("");
    for (let i = 0; i < pasted.length; i++) {
      nextCode[i] = pasted[i];
    }
    setCode(nextCode);
    if (pasted.length === 6) {
      handleVerifySms(pasted);
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      const nextCode = [...code];
      nextCode[idx - 1] = "";
      setCode(nextCode);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleVerifySms(code.join(""));
    }
  };

  const handleVerifySms = async (enteredCode?: string) => {
    const raw = (enteredCode ?? code.join("")).trim();
    if (!/^\d{6}$/.test(raw)) {
      toast.error("Saisissez le code OTP à 6 chiffres.");
      return;
    }

    setIsLoading(true);
    try {
      await verifyLogin2FA({ mode: "sms", code: raw });
      toast.success("Authentification double facteur validée avec succès !");
      await complete2FAAndRedirect(navigate);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Code OTP incorrect ou expiré.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async (preferEmail = false) => {
    setIsLoading(true);
    try {
      const otp = await sendLoginSmsOtp({ preferEmail });
      setSecondsLeft(otp.expiresInSeconds);
      setMaskedPhone(otp.maskedPhone);
      setOtpChannel(otp.otpChannel ?? "sms");

      toast.success(
        otp.otpChannel === "email"
          ? "Nouveau code OTP envoyé par e-mail."
          : "Nouveau code OTP envoyé par SMS Orange.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de renvoyer le code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToCustomPhone = async () => {
    const raw = customPhone.trim();
    if (!raw) {
      toast.error("Veuillez renseigner un numéro de téléphone.");
      return;
    }
    setIsLoading(true);
    try {
      const otp = await sendLoginSmsOtp({ phone: raw });
      setSecondsLeft(otp.expiresInSeconds);
      setMaskedPhone(otp.maskedPhone);
      setOtpChannel("sms");
      setShowPhoneInput(false);
      setCustomPhone("");
      toast.success("Code OTP envoyé par SMS Orange", {
        description: `SMS transmis au ${otp.maskedPhone || raw}.`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi du SMS Orange.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const pct = (secondsLeft / 120) * 100;

  return (
    <div className="w-full space-y-4 flex flex-col items-center animate-fade-in text-center">
      {/* Header compact */}
      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold">
            <ShieldCheck className="h-3 w-3" />
            <span>Contrôle d'accès sécurisé</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-[11px] font-semibold">
            <MessageSquare className="h-3 w-3" />
            <span>Orange SMS Pro</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Double authentification</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {otpChannel === "email"
            ? `Code OTP envoyé par e-mail. Expire dans ${formatTime(secondsLeft)}.`
            : maskedPhone
              ? `Code SMS envoyé au ${maskedPhone}. Expire dans ${formatTime(secondsLeft)}.`
              : `Saisissez le code de validation sécurisé à 6 chiffres.`}
        </p>
      </div>

      <div className="space-y-4 w-full flex flex-col items-center max-w-sm">
        {/* Timer progress bar compacte */}
        <div className="w-full">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Délai de validité</span>
            <span className={pct < 30 ? "text-red-500 font-bold" : "font-mono"}>
              {formatTime(secondsLeft)}
            </span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: pct < 30 ? "#ef4444" : undefined }}
            />
          </div>
        </div>

        {/* 6 OTP Inputs */}
        <div className="flex gap-2 justify-center w-full py-1">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputsRef.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onPaste={handlePaste}
              className="w-10 h-12 text-center text-xl font-bold rounded-lg border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          ))}
        </div>

        {/* Bouton de validation principal */}
        <Button
          onClick={() => handleVerifySms(code.join(""))}
          disabled={isLoading}
          className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold py-2 text-sm shadow-[var(--glow-primary)]"
        >
          {isLoading ? "Vérification..." : "Valider le code 2FA"}
        </Button>

        {/* Options de renvoi SMS / Email */}
        <div className="flex gap-2 justify-center w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResendOtp(false)}
            disabled={isLoading || secondsLeft > 90}
            className="text-xs gap-1.5 h-8 flex-1"
          >
            <RefreshCw className="h-3 w-3" />
            {otpChannel === "email" ? "Renvoyer e-mail" : "Renvoyer SMS Orange"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleResendOtp(true)}
            disabled={isLoading}
            className="text-xs gap-1.5 h-8 flex-1"
          >
            <Mail className="h-3 w-3" />
            Recevoir par e-mail
          </Button>
        </div>

        {/* Envoi vers un autre numéro de téléphone sénégalais */}
        <div className="w-full pt-1">
          {!showPhoneInput ? (
            <button
              type="button"
              onClick={() => setShowPhoneInput(true)}
              className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <Phone className="h-3 w-3" />
              <span>Recevoir sur un autre numéro (Sénégal)</span>
            </button>
          ) : (
            <div className="space-y-2 p-2.5 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 text-left">
              <label className="text-[11px] font-medium text-orange-700 dark:text-orange-300 block">
                Numéro mobile (ex: +221 77 123 45 67)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="tel"
                  placeholder="+221 77..."
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-input bg-card focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendToCustomPhone}
                  disabled={isLoading || !customPhone.trim()}
                  className="text-xs h-8 bg-orange-500 hover:bg-orange-600 text-white gap-1"
                >
                  <Send className="h-3 w-3" />
                  <span>Envoyer</span>
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneInput(false)}
                className="text-[10px] text-muted-foreground hover:underline"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
