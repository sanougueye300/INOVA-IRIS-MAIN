import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/iris")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
