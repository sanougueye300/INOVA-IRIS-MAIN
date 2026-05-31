import { createFileRoute } from "@tanstack/react-router";
import { IrisPage } from "@/components/soc/IrisPage";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/iris")({
  head: () => ({ meta: [{ title: "DFIR-IRIS — INOVA-IRIS" }] }),
  component: () => (
    <RequireAuth>
      <IrisPage />
    </RequireAuth>
  ),
});
