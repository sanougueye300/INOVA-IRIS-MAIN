import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brain, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Msg { role: "user" | "assistant"; content: string }

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Bonjour 👋 Je suis l'analyste IA du SOC Sonatel. Posez-moi une question sur les alertes, les IOC ou les bonnes pratiques de réponse à incident." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("soc:open-ai", onOpen);
    if (typeof window !== "undefined" && window.location.hash === "#ai") setOpen(true);
    return () => window.removeEventListener("soc:open-ai", onOpen);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("soc-ai-chat", {
        body: { messages: next },
      });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data?.reply ?? "(réponse vide)" }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setMessages([...next, { role: "assistant", content: "⚠️ " + msg }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="no-print fixed bottom-6 right-6 z-50 h-14 rounded-full bg-[image:var(--gradient-hero)] px-6 text-white shadow-[0_10px_30px_-10px_var(--primary)]"
        >
          <Brain className="mr-2 h-5 w-5" /> Djib'son IA
          <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Analyste IA — Sonatel SOC
          </SheetTitle>
        </SheetHeader>
        <div className="border-b border-border px-4 py-2">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Actions rapides (Wazuh / TheHive / MISP / IRIS)</p>
          <div className="flex flex-wrap gap-1">
            {[
              ["Sigma/LQL", "Génère Sigma + LQL Wazuh pour PowerShell encodé."],
              ["Alerte critique", "Résume la dernière alerte critique et les prochaines étapes."],
              ["Shuffle", "Suggère un playbook Shuffle pour exfiltration DNS."],
              ["IOC", "Compare deux IOC : 203.0.113.44 vs evil-update.net."],
            ].map(([label, prompt]) => (
              <button
                key={label}
                type="button"
                className="rounded-full border border-border bg-secondary/50 px-2 py-1 text-[11px] hover:bg-secondary"
                onClick={() => setInput(prompt)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-secondary px-4 py-2 text-sm text-muted-foreground">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ex : explique-moi cette alerte SSH brute force…" />
            <Button type="submit" disabled={busy} size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
