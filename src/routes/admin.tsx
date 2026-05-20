import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administration — SOC Platform" }] }),
  component: () => (
    <RequireAuth requireAdmin>
      <Outlet />
    </RequireAuth>
  ),
});