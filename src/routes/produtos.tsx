import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { ProductCard } from "@/components/ProductCard";
import { productsQueryOptions } from "@/lib/brasa";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Pantanal Smoke" },
      {
        name: "description",
        content:
          "Essências, narguilés, carvão e acessórios. Escolha, adicione ao carrinho e finalize pelo WhatsApp.",
      },
      { property: "og:title", content: "Produtos — Pantanal Smoke" },
      {
        property: "og:description",
        content: "Escolha, adicione ao carrinho e finalize pelo WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQueryOptions()),
  component: Produtos,
});

function Produtos() {
  const { data: products } = useSuspenseQuery(productsQueryOptions());
  const [category, setCategory] = useState("Todos");

  const categories = ["Todos", ...new Set(products.map((p) => p.category))];
  const visible =
    category === "Todos" ? products : products.filter((p) => p.category === category);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Nossos produtos</h1>
      <p className="mt-2 text-muted-foreground">
        Escolha, adicione ao carrinho e finalize pelo WhatsApp.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              category === c
                ? "border-primary bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-muted-foreground">Nenhum produto nesta categoria.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
