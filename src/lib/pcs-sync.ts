import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientPcItem {
  id: string;
  name: string;
  hostname: string;
  clientName: string;
  clientId?: string;
  os: "windows" | "linux" | "macos";
  ip: string;
  status: "active" | "disconnected" | "alert" | "isolated";
  cpu: number;
  ram: number;
  version: string;
  lastSeen: string;
  wazuhId?: string;
  addedAt: number;
}

const STORAGE_KEY = "inova_all_client_pcs";
const EVENT_NAME = "inova_pcs_updated";

/**
 * Récupère tous les PC ajoutés par les clients depuis le registre global et les clés client_ext_*
 */
export function getAllClientPcs(): ClientPcItem[] {
  if (typeof window === "undefined") return [];
  const map = new Map<string, ClientPcItem>();

  // 1. Lire depuis le registre central
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: ClientPcItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((pc) => map.set(pc.id, pc));
      }
    }
  } catch (e) {
    console.error("Erreur lecture inova_all_client_pcs:", e);
  }

  // 2. Parcourir également toutes les clés client_ext_* pour s'assurer qu'aucun PC n'est omis
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("client_ext_")) {
        const item = localStorage.getItem(key);
        if (item) {
          const ext = JSON.parse(item);
          if (Array.isArray(ext.pcs)) {
            ext.pcs.forEach((pc: any) => {
              if (pc && pc.id && !map.has(pc.id)) {
                const itemNormalized: ClientPcItem = {
                  id: pc.id,
                  name: pc.name || pc.hostname || "PC-Client",
                  hostname: pc.name || pc.hostname || "PC-Client",
                  clientName: ext.organization || ext.orgName || "Espace Client",
                  clientId: ext.clientId,
                  os: pc.os || "windows",
                  ip: pc.ip || "192.168.1.100",
                  status: pc.status || "active",
                  cpu: pc.cpu ?? 15,
                  ram: pc.ram ?? 42,
                  version: "v4.14.5",
                  lastSeen: pc.lastSeen || "À l'instant",
                  wazuhId: pc.wazuhId || String(Math.floor(Math.random() * 900) + 100),
                  addedAt: Date.now(),
                };
                map.set(pc.id, itemNormalized);
              }
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Erreur scan client_ext_*:", e);
  }

  return Array.from(map.values()).sort((a, b) => b.addedAt - a.addedAt);
}

/**
 * Enregistre un nouveau PC ajouté par un client dans le registre central et notifie les écouteurs
 */
export function registerClientPc(pc: Omit<ClientPcItem, "addedAt">): ClientPcItem {
  const fullPc: ClientPcItem = {
    ...pc,
    addedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      const all = getAllClientPcs();
      const next = [fullPc, ...all.filter((p) => p.id !== fullPc.id)];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

      // Synchroniser aussi dans client_ext_* pour que l'admin voie les PCs ajoutés côté client
      if (fullPc.clientId) {
        const extKey = `client_ext_${fullPc.clientId}`;
        try {
          const extRaw = localStorage.getItem(extKey);
          if (extRaw) {
            const ext = JSON.parse(extRaw);
            const existingPcs = Array.isArray(ext.pcs) ? ext.pcs : [];
            // Ajouter le PC s'il n'existe pas déjà
            if (!existingPcs.some((p: any) => p.id === fullPc.id)) {
              ext.pcs = [...existingPcs, {
                id: fullPc.id,
                name: fullPc.name || fullPc.hostname,
                os: fullPc.os,
                ip: fullPc.ip,
                status: fullPc.status,
                cpu: fullPc.cpu,
                ram: fullPc.ram,
                lastSeen: fullPc.lastSeen,
                wazuhId: fullPc.wazuhId || String(Math.floor(Math.random() * 900) + 100),
              }];
              ext._v = 2; // Marquer comme version actuelle pour éviter la purge
              localStorage.setItem(extKey, JSON.stringify(ext));
            }
          }
        } catch (syncErr) {
          console.error("Erreur sync client_ext_*:", syncErr);
        }
      }

      // Émettre l'événement pour la mise à jour immédiate en temps réel sur tous les dashboards
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: fullPc }));
    } catch (e) {
      console.error("Erreur enregistrement PC:", e);
    }
  }

  return fullPc;
}

export async function saveClientPcToCloud(pc: ClientPcItem): Promise<void> {
  if (!pc.clientId) throw new Error("L'identifiant du client est requis pour enregistrer le poste.");

  const { error } = await (supabase as any).from("client_pcs").upsert({
    id: pc.id,
    client_id: pc.clientId,
    name: pc.name,
    hostname: pc.hostname,
    client_name: pc.clientName,
    os: pc.os,
    ip: pc.ip,
    status: pc.status,
    cpu: pc.cpu,
    ram: pc.ram,
    version: pc.version,
    last_seen: pc.lastSeen,
    wazuh_id: pc.wazuhId ?? null,
    added_at: new Date(pc.addedAt).toISOString(),
  }, { onConflict: "id" });

  if (error) throw error;
}

export async function loadClientPcsFromCloud(clientId: string): Promise<ClientPcItem[]> {
  const { data, error } = await (supabase as any)
    .from("client_pcs")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("added_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapCloudPcRow);
}

export async function loadAllClientPcsFromCloud(): Promise<ClientPcItem[]> {
  const { data, error } = await (supabase as any)
    .from("client_pcs")
    .select("*")
    .is("deleted_at", null)
    .order("added_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapCloudPcRow);
}

function mapCloudPcRow(row: any): ClientPcItem {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    clientName: row.client_name,
    clientId: row.client_id,
    os: row.os,
    ip: row.ip,
    status: row.status,
    cpu: row.cpu,
    ram: row.ram,
    version: row.version,
    lastSeen: row.last_seen,
    wazuhId: row.wazuh_id ?? undefined,
    addedAt: new Date(row.added_at).getTime(),
  };
}

export async function deleteClientPcFromCloud(clientId: string, pcId: string): Promise<boolean> {
  const { error } = await (supabase as any)
    .from("client_pcs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("id", pcId)
    .is("deleted_at", null);

  if (error && !["PGRST205", "42P01", "22P02", "23503"].includes(error.code)) throw error;

  const cloudSynced = !error;

  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as ClientPcItem[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.filter((pc) => pc.id !== pcId)));

      const clientKey = `client_ext_${clientId}`;
      const extRaw = localStorage.getItem(clientKey);
      if (extRaw) {
        const ext = JSON.parse(extRaw);
        ext.pcs = Array.isArray(ext.pcs) ? ext.pcs.filter((pc: { id?: string }) => pc.id !== pcId) : [];
        ext._v = 2;
        localStorage.setItem(clientKey, JSON.stringify(ext));
      }
    } catch (cacheError) {
      console.error("Erreur de suppression du cache local du poste:", cacheError);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id: pcId, deleted: true } }));
  }

  return cloudSynced;
}

export async function syncClientPcsWithCloud(
  clientId: string,
  clientName: string,
  cachedPcs: Array<Pick<ClientPcItem, "id" | "name" | "os" | "ip" | "status" | "cpu" | "ram" | "lastSeen" | "wazuhId">>,
): Promise<ClientPcItem[]> {
  let cloudPcs = await loadClientPcsFromCloud(clientId);
  const { data: existingRows, error: existingRowsError } = await (supabase as any)
    .from("client_pcs")
    .select("id, deleted_at")
    .eq("client_id", clientId);
  if (existingRowsError) throw existingRowsError;
  const knownIds = new Set((existingRows ?? []).map((row: { id: string }) => row.id));
  const deletedIds = new Set((existingRows ?? []).filter((row: { deleted_at: string | null }) => row.deleted_at).map((row: { id: string }) => row.id));
  const legacyPcs = cachedPcs.filter((pc) => !knownIds.has(pc.id));

  if (legacyPcs.length > 0) {
    const existing = new Map(getAllClientPcs().map((pc) => [pc.id, pc]));
    await Promise.all(legacyPcs.map((pc) => saveClientPcToCloud({
      ...pc,
      hostname: pc.name,
      clientName,
      clientId,
      version: "v4.14.5",
      addedAt: existing.get(pc.id)?.addedAt ?? Date.now(),
    })));
    cloudPcs = await loadClientPcsFromCloud(clientId);
  }

  const merged = new Map(cachedPcs.filter((pc) => !deletedIds.has(pc.id)).map((pc) => [pc.id, {
    ...pc,
    hostname: pc.name,
    clientName,
    clientId,
    version: "v4.14.5",
    addedAt: Date.now(),
  } satisfies ClientPcItem]));
  cloudPcs.forEach((pc) => merged.set(pc.id, pc));
  const result = Array.from(merged.values()).sort((a, b) => b.addedAt - a.addedAt);

  if (typeof window !== "undefined") {
    const all = new Map(getAllClientPcs().map((pc) => [pc.id, pc]));
    result.forEach((pc) => all.set(pc.id, pc));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(all.values())));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }

  return result;
}

/**
 * Hook pour obtenir le nombre total dynamique de postes EDR surveillés
 * (Base nominale 142 + tous les PC clients enrôlés)
 */
export function useLivePcsData(baseCount = 142) {
  const [pcs, setPcs] = useState<ClientPcItem[]>(() => getAllClientPcs());

  useEffect(() => {
    let cancelled = false;
    const handleUpdate = () => {
      setPcs(getAllClientPcs());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    loadAllClientPcsFromCloud().then((cloudPcs) => {
      if (cancelled) return;
      const merged = new Map(getAllClientPcs().map((pc) => [pc.id, pc]));
      cloudPcs.forEach((pc) => merged.set(pc.id, pc));
      const allPcs = Array.from(merged.values()).sort((a, b) => b.addedAt - a.addedAt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPcs));
      setPcs(allPcs);
    }).catch((error) => {
      console.error("Erreur de chargement cloud des postes EDR:", error);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const addedCount = pcs.length;
  const totalPcs = baseCount + addedCount;
  const latestAdded = pcs.length > 0 ? pcs[0] : null;

  // Répartition nominale : 48 serveurs, 74 postes PC, 20 IoT
  let addedServers = 0;
  let addedPC = 0;

  pcs.forEach((p) => {
    if (p.os === "linux" && p.hostname.toLowerCase().startsWith("srv")) {
      addedServers++;
    } else {
      addedPC++;
    }
  });

  return {
    totalPcs,
    addedCount,
    pcs,
    latestAdded,
    distribution: {
      servers: 48 + addedServers,
      pcs: 74 + addedPC,
      iot: 20,
    },
  };
}
