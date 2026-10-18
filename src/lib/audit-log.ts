import { supabase } from "@/integrations/supabase/client";

const LOCAL_AUDIT_KEY = "inova_audit_pending";
export const LOCAL_AUDIT_EVENT = "inova_audit_updated";

export interface LocalAuditEvent {
  id: string;
  date: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
  status: string;
  details: string;
  organization: string | null;
  actor_scope: "client" | "staff";
  client_id: string | null;
}

export function getLocalAuditEvents(): LocalAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_AUDIT_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveLocalAuditEvent(event: LocalAuditEvent): void {
  if (typeof window === "undefined") return;
  const rows = getLocalAuditEvents().filter((row) => row.id !== event.id);
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify([event, ...rows].slice(0, 500)));
  window.dispatchEvent(new CustomEvent(LOCAL_AUDIT_EVENT));
}

export async function recordAuditEvent(
  action: string,
  resource: string,
  details: Record<string, unknown> = {},
  organization?: string | null,
  actorScope: "client" | "staff" = "staff",
  scopedClientId?: string | null,
): Promise<void> {
  const id = crypto.randomUUID();
  let actorEmail = scopedClientId || "Utilisateur local";
  let userId: string | null = null;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user) {
      actorEmail = user.email || user.id;
      userId = user.id;
    }
  } catch (error) {
    console.error("Impossible d'identifier l'acteur du journal d'audit:", error);
  }

  const localEvent: LocalAuditEvent = {
    id,
    date: new Date().toISOString(),
    user: actorEmail,
    action,
    resource,
    ip: "—",
    status: action.toLowerCase().includes("failed") ? "failure" : "success",
    details: JSON.stringify({ resource, ...details, syncStatus: userId ? "pending" : "local_only" }),
    organization: organization ?? null,
    actor_scope: actorScope,
    client_id: actorScope === "client" ? scopedClientId || userId : null,
  };

  saveLocalAuditEvent(localEvent);

  if (!userId) {
    return;
  }

  try {
    const { error } = await (supabase as any).from("audit_logs").insert({
      id,
      user_id: userId,
      action,
      organization: organization ?? null,
      actor_scope: actorScope,
      client_id: actorScope === "client" ? scopedClientId || userId : null,
      metadata: { resource, ...details },
    });

    if (error) {
      console.error("Échec d'écriture du journal d'audit:", error);
      return;
    }
    saveLocalAuditEvent({
      ...localEvent,
      details: JSON.stringify({ resource, ...details, syncStatus: "synced" }),
    });
  } catch (error) {
    console.error("Échec d'écriture du journal d'audit:", error);
  }
}