import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/threat-map")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
