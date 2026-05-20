import orangeLogo from "@/assets/orange-logo.png";
import { cn } from "@/lib/utils";

export function SonatelLogo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <img
      src={orangeLogo}
      alt="Orange Logo"
      className={cn(
        "object-contain transition-all duration-300 hover:scale-105 select-none",
        className
      )}
    />
  );
}