export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} SOC Platform — Détection & Réponse Cyber</p>
        <p>Wazuh · Shuffle · TheHive · MISP · VirusTotal</p>
      </div>
    </footer>
  );
}