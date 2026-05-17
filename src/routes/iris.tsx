import { createFileRoute } from "@tanstack/react-router";
import { IrisPage } from "@/components/soc/IrisPage";

export const Route = createFileRoute("/iris")({
  head: () => ({ meta: [{ title: "DFIR-IRIS — INOVA-IRIS" }] }),
  component: IrisPage,
});
