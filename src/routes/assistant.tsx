import { createFileRoute } from "@tanstack/react-router";
import { AssistantPage } from "@/components/soc/AssistantPage";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "Assistant IA — INOVA-IRIS" }] }),
  component: AssistantPage,
});
