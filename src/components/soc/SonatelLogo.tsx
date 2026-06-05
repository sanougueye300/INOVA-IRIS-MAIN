import orangeLogo from "@/assets/orange-logo.png";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function SonatelLogo({ className = "h-9 w-auto" }: { className?: string }) {
  const [logoSrc, setLogoSrc] = useState(orangeLogo);

  useEffect(() => {
    const checkLogo = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("soc-admin-settings");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.logoBase64) {
              setLogoSrc(parsed.logoBase64);
              return;
            }
          } catch (e) {}
        }
      }
      setLogoSrc(orangeLogo);
    };

    checkLogo();
    window.addEventListener("storage", checkLogo);
    window.addEventListener("soc-logo-updated", checkLogo);
    return () => {
      window.removeEventListener("storage", checkLogo);
      window.removeEventListener("soc-logo-updated", checkLogo);
    };
  }, []);

  return (
    <img
      src={logoSrc}
      alt="Platform Logo"
      className={cn(
        "object-contain transition-all duration-300 hover:scale-105 select-none",
        className
      )}
    />
  );
}