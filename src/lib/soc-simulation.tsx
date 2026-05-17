import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { mockAlertGraphNodes, type MockAlertNode } from "@/lib/soc-mock";

type SimulationContextValue = {
  /** Incrémenté à chaque injection — les pages peuvent fusionner ces alertes fictives. */
  injectionEpoch: number;
  /** Alertes mock ajoutées pour la session courante. */
  injectedAlerts: MockAlertNode[];
  injectRedTeam: () => void;
  clearInjection: () => void;
};

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SocSimulationProvider({ children }: { children: ReactNode }) {
  const [injectionEpoch, setInjectionEpoch] = useState(0);
  const [injectedAlerts, setInjectedAlerts] = useState<MockAlertNode[]>([]);

  const injectRedTeam = useCallback(() => {
    const now = new Date().toISOString();
    const extra: MockAlertNode[] = [
      {
        id: `redteam-${Date.now()}-1`,
        title: "[SIMULATION] Exfiltration DNS simulée",
        severity: 12,
        status: "new",
        ruleId: "92050",
        mitreTactic: "TA0010",
        sourceIp: "198.51.100.99",
        hostname: "sim-endpoint-01",
        detectedAt: now,
        agentName: "sim-01",
      },
      {
        id: `redteam-${Date.now()}-2`,
        title: "[SIMULATION] Connexion C2 factice",
        severity: 11,
        status: "new",
        ruleId: "61603",
        mitreTactic: "TA0011",
        sourceIp: "203.0.113.99",
        hostname: "sim-endpoint-01",
        detectedAt: now,
        agentName: "sim-01",
      },
    ];
    setInjectedAlerts((prev) => [...extra, ...prev]);
    setInjectionEpoch((e) => e + 1);
  }, []);

  const clearInjection = useCallback(() => {
    setInjectedAlerts([]);
    setInjectionEpoch((e) => e + 1);
  }, []);

  const value = useMemo(
    () => ({ injectionEpoch, injectedAlerts, injectRedTeam, clearInjection }),
    [injectionEpoch, injectedAlerts, injectRedTeam, clearInjection],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSocSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSocSimulation must be used within SocSimulationProvider");
  return ctx;
}
