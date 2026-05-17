import type { ReactNode } from "react";
import { SocPreferencesProvider } from "@/lib/soc-preferences";
import { SocSimulationProvider } from "@/lib/soc-simulation";
import { SocSidebar } from "./SocSidebar";
import { SocTopbar } from "./SocTopbar";
import { CommandPalette } from "./CommandPalette";
import { AIAssistant } from "./AIAssistant";
import { useSocPreferences } from "@/lib/soc-preferences";
import { ThemeCustomizer } from "./ThemeCustomizer";

function SocShellInner({ children }: { children: ReactNode }) {
  const { bodyBackground } = useSocPreferences();
  const bgClass = bodyBackground === "dotted" ? "bg-dotted" : bodyBackground === "grid" ? "bg-grid" : "bg-background";

  return (
    <SocSimulationProvider>
      <div className={`flex min-h-screen w-full flex-col ${bgClass}`}>
        <SocTopbar />
        <div className="flex flex-1 items-start">
          <div className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] lg:block">
            <SocSidebar />
          </div>
          <main className="soc-print-root flex-1 overflow-x-hidden">{children}</main>
        </div>
        <CommandPalette />
        <AIAssistant />
        <ThemeCustomizer />
      </div>
    </SocSimulationProvider>
  );
}

export function SocShell({ children }: { children: ReactNode }) {
  return (
    <SocPreferencesProvider>
      <SocShellInner>{children}</SocShellInner>
    </SocPreferencesProvider>
  );
}