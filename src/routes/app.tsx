import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Nav } from "@/components/Nav";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Chat — CampusBot" }] }),
  component: AppChat,
});

function AppChat() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-3xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <h1 className="text-4xl mb-2">Ask CampusBot</h1>
          <p className="text-muted-foreground">Search the knowledge base, then AI fills the gaps. Every chat is saved to your history.</p>
        </div>
        {user && <ChatPanel mode="authed" />}
      </main>
    </div>
  );
}
