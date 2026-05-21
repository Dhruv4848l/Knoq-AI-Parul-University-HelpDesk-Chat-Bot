import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — CampusBot" }, { name: "description", content: "Create your CampusBot account with your Parul University email." }] }),
  component: () => <AuthForm mode="signup" />,
});
