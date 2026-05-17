import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sonatel SOC" }] }),
  component: LoginRedirect,
});

function LoginRedirect() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/dashboard", replace: true }); }, [navigate]);
  return null;
}