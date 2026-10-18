import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/outils/")({
  beforeLoad: () => {
    throw redirect({ to: "/outils/wazuh" });
  },
  component: () => null,
});
