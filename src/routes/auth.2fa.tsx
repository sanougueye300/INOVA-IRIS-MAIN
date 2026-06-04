import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { QrCode, Copy, Check, Smartphone, KeyRound, Settings2, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode.react";
import {
  complete2FAAndRedirect,
  getOtpMeta,
  invokeAuthSecurity,
  isPending2FA,
  sendLoginSmsOtp,
  verifyLogin2FA,
} from "@/lib/auth-security";

export const Route = createFileRoute("/auth/2fa")({
  component: TwoFactorPage,
});

type ViewMode = "sms" | "backup" | "setup";

function TwoFactorPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>("sms");
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [backupCode, setBackupCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [otpChannel, setOtpChannel] = useState<"sms" | "email" | "screen">("sms");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [remainingCodes, setRemainingCodes] = useState(0);
  const [totpEnrolled, setTotpEnrolled] = useState(false);

  // TOTP setup
  const [enrollQr, setEnrollQr] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollFactorId, setEnrollFactorId] = useState<string | null>(null);
  const [setupCode, setSetupCode] = useState("");

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await invokeAuthSecurity<{
        remainingCodes: number;
        totpEnrolled: boolean;
      }>("list_backup_codes_status");
      setRemainingCodes(status.remainingCodes);
      setTotpEnrolled(status.totpEnrolled);
    } catch {
      /* session may not be ready */
    }
  }, []);

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
    }
    refreshStatus();
  }, [navigate, refreshStatus]);

  useEffect(() => {
    if (secondsLeft <= 0 || view !== "sms") return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft, view]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
      const nextCode = [...code];
      nextCode[idx - 1] = "";
      setCode(nextCode);
    }
  };

  const handleVerifySms = async (enteredCode: string) => {
    setIsLoading(true);
    try {
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      const activeFactor = factorData?.all?.find(
        (f) => f.status === "verified" && f.factor_type === "totp",
      );

      if (activeFactor) {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: activeFactor.id,
        });
        if (challengeError) throw challengeError;
        await verifyLogin2FA({
          mode: "totp",
          code: enteredCode,
          factorId: activeFactor.id,
          challengeId: challengeData.id,
        });
      } else {
        await verifyLogin2FA({ mode: "sms", code: enteredCode });
      }

      toast.success("Authentification double facteur validée.");
      complete2FAAndRedirect(navigate);
    } catch (err: unknown) {
      toast.error("Code invalide", {
        description: err instanceof Error ? err.message : "Vérifiez le code SMS ou Authenticator.",
      });
      setCode(Array(6).fill(""));
      inputsRef.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode.trim()) return;
    setIsLoading(true);
    try {
      await verifyLogin2FA({ mode: "backup", code: backupCode.trim() });
      toast.success("Code de secours accepté.");
      complete2FAAndRedirect(navigate);
    } catch (err: unknown) {
      toast.error("Code de secours invalide", {
        description: err instanceof Error ? err.message : undefined,
      });
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
          : "Nouveau code OTP envoyé par SMS.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de renvoyer le code.");
    } finally {
      setIsLoading(false);
    }
  };

  const startTotpEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Google Authenticator — INOVA-IRIS",
      });
      if (error) throw error;
      setEnrollQr(data.totp.qr_code);
      setEnrollSecret(data.totp.secret);
      setEnrollFactorId(data.id);
      setView("setup");
    } catch (err: unknown) {
      toast.error("Configuration Authenticator impossible", {
        description: err instanceof Error ? err.message : "Activez MFA dans Supabase ou réessayez.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmTotpEnroll = async () => {
    if (!enrollFactorId || setupCode.length !== 6) return;
    setIsLoading(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollFactorId,
      });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challengeData.id,
        code: setupCode,
      });
      if (verifyError) throw verifyError;

      await invokeAuthSecurity("mark_totp_enrolled");
      const { codes } = await invokeAuthSecurity<{ codes: string[] }>("generate_backup_codes");
      setBackupCodes(codes);
      setTotpEnrolled(true);
      setRemainingCodes(codes.length);
      toast.success("Google Authenticator configuré. Conservez vos codes de secours.");
    } catch (err: unknown) {
      toast.error("Échec de validation", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCodes = () => {
    if (!backupCodes.length) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    toast.success("Codes copiés.");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pct = (secondsLeft / 120) * 100;

  return (
    <div className="w-full space-y-6 flex flex-col items-center animate-fade-in text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold tracking-tight">Double authentification</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {view === "setup"
            ? "Scannez le QR code avec Google Authenticator, puis validez avec un code à 6 chiffres."
            : otpChannel === "email"
              ? `Code OTP envoyé par e-mail. Expire dans ${formatTime(secondsLeft)}.`
              : maskedPhone
                ? `Code SMS envoyé au ${maskedPhone}. Expire dans ${formatTime(secondsLeft)}.`
                : "Saisissez le code reçu par SMS ou Google Authenticator."}
        </p>
      </div>

      {view === "setup" ? (
        <div className="w-full max-w-sm space-y-4 text-left">
          {enrollQr && (
            <div className="flex justify-center p-4 bg-white rounded-xl">
              {enrollQr.startsWith("data:") ? (
                <img src={enrollQr} alt="QR Google Authenticator" className="h-40 w-40" />
              ) : (
                <QRCode value={enrollQr} size={160} bgColor="#fff" fgColor="#000" />
              )}
            </div>
          )}
          {enrollSecret && (
            <p className="text-xs text-muted-foreground text-center font-mono break-all">
              Clé manuelle : {enrollSecret}
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Code à 6 chiffres"
            value={setupCode}
            onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-center text-lg font-bold tracking-widest"
          />
          <Button
            onClick={confirmTotpEnroll}
            disabled={isLoading || setupCode.length !== 6}
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold"
          >
            {isLoading ? "Validation..." : "Activer Google Authenticator"}
          </Button>
          {backupCodes.length > 0 && (
            <div className="border border-dashed border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-primary">Codes de secours</span>
                <Button variant="ghost" size="icon" onClick={handleCopyCodes} className="h-7 w-7">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {backupCodes.map((c) => (
                  <div key={c} className="bg-muted/50 p-2 rounded border">{c}</div>
                ))}
              </div>
            </div>
          )}
          <Button variant="ghost" onClick={() => setView("sms")} className="w-full text-xs">
            Retour à la saisie du code
          </Button>
        </div>
      ) : view === "backup" ? (
        <form onSubmit={handleVerifyBackup} className="w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="IN-XXXX-XXXX"
            value={backupCode}
            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-input bg-card px-4 py-2.5 text-center font-mono text-sm uppercase"
            required
          />
          <p className="text-[10px] text-muted-foreground">
            {remainingCodes > 0
              ? `${remainingCodes} code(s) de secours restant(s). Usage unique.`
              : "Aucun code configuré — générez-en depuis la configuration Authenticator."}
          </p>
          <Button type="submit" disabled={isLoading} className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold">
            {isLoading ? "Vérification..." : "Valider le code de secours"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setView("sms")} className="w-full text-xs">
            Saisir le code SMS / Authenticator
          </Button>
        </form>
      ) : (
        <div className="space-y-6 w-full flex flex-col items-center max-w-sm">

          {/* Countdown timer avec barre de progression */}
          <div className="w-full max-w-sm my-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Expiration du code</span>
              <span className={pct < 30 ? "text-red-500 font-bold" : ""}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 rounded-full"
                style={{ width: `${pct}%`, backgroundColor: pct < 30 ? "#ef4444" : undefined }} 
              />
            </div>
          </div>

          <div className="relative p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
            <Smartphone className="h-16 w-16 text-primary mx-auto" />
          </div>

          <div className="flex gap-2 justify-center w-full">
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
                className="w-11 h-14 text-center text-xl font-bold rounded-lg border border-input bg-card focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          <Button
            onClick={() => handleVerifySms(code.join(""))}
            disabled={isLoading || code.some((c) => c === "")}
            className="w-full bg-[image:var(--gradient-hero)] text-primary-foreground font-semibold py-2.5"
          >
            {isLoading ? "Vérification..." : "Vérifier le code"}
          </Button>

          <div className="flex flex-wrap gap-2 justify-center w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleResendOtp(false)}
              disabled={isLoading || secondsLeft > 90}
              className="text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              {otpChannel === "email" ? "Renvoyer e-mail" : "Renvoyer SMS"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleResendOtp(true)}
              disabled={isLoading}
              className="text-xs gap-1"
            >
              <Mail className="h-3 w-3" />
              Recevoir par e-mail
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setView("backup")} className="text-xs gap-1">
              <KeyRound className="h-3 w-3" />
              Code de secours
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={startTotpEnroll} className="text-xs gap-1">
              <Settings2 className="h-3 w-3" />
              {totpEnrolled ? "Reconfigurer Authenticator" : "Configurer Authenticator"}
            </Button>
          </div>

          {!totpEnrolled && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <QrCode className="h-3 w-3" />
              Google Authenticator recommandé pour les connexions futures.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
