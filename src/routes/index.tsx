import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")(  {
  head: () => ({
    meta: [
      { title: "INOVA-IRIS — Connexion SOC" },
      { name: "description", content: "Plateforme SOC intégrée — Authentification sécurisée. Sonatel Group." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/auth/login", replace: true });
  },
  component: () => null,
});
