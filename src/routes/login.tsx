import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — CampusBot" }, { name: "description", content: "Sign in with your Parul University email." }] }),
  component: () => <AuthForm mode="login" />,
});
