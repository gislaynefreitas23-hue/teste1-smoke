import { useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { safeInternalPath } from "@/lib/brasa";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Pantanal Smoke" },
      {
        name: "description",
        content:
          "Entre com seu e-mail para ativar o cashback de 5%. Sem senha: basta clicar no link recebido por e-mail.",
      },
      { property: "og:title", content: "Entrar — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Ative seu cashback de 5% entrando com seu e-mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next: string } => ({
    next: safeInternalPath(search["next"]) ?? "",
  }),
  component: Auth,
});

function Auth() {
  const { next } = useSearch({ from: "/auth" });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("idle");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${next || "/conta"}`,
        data: name.trim() ? { name: name.trim() } : undefined,
      },
    });

    setBusy(false);

    if (error) {
      setStatus("error");
      setMessage(
        error.message.includes("rate")
          ? "Você pediu muitos links. Aguarde um pouco e tente de novo."
          : "Não foi possível enviar o link. Confira o e-mail digitado.",
      );
      return;
    }

    setStatus("sent");
    setMessage(
      "Enviamos um link de acesso para o seu e-mail. Abra a mensagem no mesmo navegador para entrar.",
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-20">
      <h1 className="text-3xl font-bold">Entrar com e-mail</h1>
      <p className="mt-2 text-muted-foreground">
        Ative seu cashback de 5%. Sem senha: basta clicar no link recebido por e-mail.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="name">Seu nome completo (opcional)</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Carlos Silva"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-ember shadow-glow"
          size="lg"
          disabled={busy}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {busy ? "Enviando..." : "Enviar link de acesso"}
        </Button>
      </form>

      {status === "sent" && (
        <p className="mt-4 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
          {message}
        </p>
      )}
      {status === "error" && <p className="mt-4 text-sm text-destructive">{message}</p>}

      <p className="mt-6 text-xs text-muted-foreground">
        Ao entrar, você declara ter 18 anos ou mais.
      </p>
    </main>
  );
}
