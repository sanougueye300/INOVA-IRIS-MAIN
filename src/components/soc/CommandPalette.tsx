import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  AlertTriangle,
  Database,
  Shield,
  Bug,
  ServerCog,
  ScanSearch,
  Workflow,
  Settings,
  Brain,
  Globe2,
  Layers,
  Fingerprint,
} from "lucide-react";

const ITEMS = [
  { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard },
  { label: "Alertes", to: "/alertes", icon: AlertTriangle },
  { label: "IOC", to: "/iocs", icon: Database },
  { label: "Threat Map", to: "/threat-map", icon: Globe2 },
  { label: "Djib'son IA", to: "/assistant", icon: Brain },
  { label: "DFIR-IRIS", to: "/iris", icon: Fingerprint },
  { label: "Outils SOC — Orchestrateur", to: "/outils", hash: "orchestrator", icon: Layers },
  { label: "Wazuh", to: "/outils", hash: "wazuh", icon: Shield },
  { label: "TheHive", to: "/outils", hash: "thehive", icon: Bug },
  { label: "MISP", to: "/outils", hash: "misp", icon: ServerCog },
  { label: "VirusTotal", to: "/outils", hash: "virustotal", icon: ScanSearch },
  { label: "Shuffle", to: "/outils", hash: "shuffle", icon: Workflow },
  { label: "Administration", to: "/admin", icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("soc:open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("soc:open-command", onOpen);
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher un module, une page, une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {ITEMS.map((it) => (
            <CommandItem
              key={it.label}
              onSelect={() => {
                setOpen(false);
                navigate({ to: it.to, hash: it.hash });
              }}
            >
              <it.icon className="mr-2 h-4 w-4" />
              {it.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
