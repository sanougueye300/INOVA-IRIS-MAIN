import type { ReactNode } from "react";

// Authentication has been removed — all routes are publicly accessible.
// This component is kept as a no-op passthrough for backwards compatibility.
export function RequireAuth({ children }: { children: ReactNode; requireAdmin?: boolean }) {
  return <>{children}</>;
}