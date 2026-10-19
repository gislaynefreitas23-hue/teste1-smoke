import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AgeGate } from "../components/AgeGate";
import { CityDialog } from "../components/CityDialog";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { CartProvider } from "../lib/cart";
import { CityProvider } from "../lib/city";
import { SITE_NAME } from "../lib/brasa";
import { supabase } from "../integrations/supabase/client";
import {
  saveStoreSettingsLocally,
  fetchRemoteStoreSettings,
  SYSTEM_SETTINGS_CATEGORY,
} from "../lib/store-settings";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você abriu não existe ou mudou de lugar.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-ember px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    const msg = String(error?.message || "");
    if (/dynamically imported module|Importing a module script failed/i.test(msg)) {
      const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem("chunk-reload-at", String(Date.now()));
        window.location.reload();
        return;
      }
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar de novo ou voltar para a loja.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-ember px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para a loja
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE_NAME} — Essências, narguilés e 5% de cashback` },
      {
        name: "description",
        content:
          "Loja de essências, narguilés e acessórios em Cuiabá. Monte o carrinho, finalize pelo WhatsApp e ganhe 5% de cashback em cada compra.",
      },
      { name: "author", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      {
        property: "og:description",
        content: "Peça pelo WhatsApp e ganhe 5% de cashback em cada compra.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Source+Sans+3:ital,wght@0,300..700;1,300..700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Após uma nova publicação, arquivos antigos somem: recarrega a página uma vez para buscar a versão nova.
  useEffect(() => {
    const KEY = "chunk-reload-at";
    const reloadOnce = () => {
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    };
    const onPreload = (e: Event) => {
      e.preventDefault();
      reloadOnce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason || "");
      if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(msg)) {
        e.preventDefault();
        reloadOnce();
      }
    };
    window.addEventListener("vite:preloadError", onPreload);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("vite:preloadError", onPreload);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // Remove permanentemente qualquer botão, selo ou elemento do Lovable que possa ser injetado no DOM
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const purgeLovableElements = () => {
      const selectors = [
        "#lovable-badge",
        "[id*='lovable-badge']",
        "[id*='lovable']",
        "[data-lovable-badge]",
        ".lovable-badge",
        "[class*='lovable-badge']",
        "a[href*='lovable.dev']",
        "a[href*='lovable.app']",
      ];
      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            el.remove();
          });
        } catch {
          // ignore
        }
      });
    };

    purgeLovableElements();
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(purgeLovableElements);
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, []);

  // Sincronização em tempo real via Supabase Realtime para produtos, pedidos e personalizações
  useEffect(() => {
    // Carrega configurações da nuvem logo na inicialização
    fetchRemoteStoreSettings().catch(() => {});

    const channel = supabase
      .channel("pantanal-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload: any) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.category === SYSTEM_SETTINGS_CATEGORY) {
            try {
              if (newRecord.description) {
                const parsed = JSON.parse(newRecord.description);
                saveStoreSettingsLocally(parsed);
              }
            } catch {
              // ignore
            }
          }
          // Invalida e atualiza consultas em tempo real
          queryClient.invalidateQueries({ queryKey: ["products"] });
          queryClient.invalidateQueries({ queryKey: ["product"] });
          queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-primary selection:text-white">
          <Outlet />
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <CityProvider>
          <AgeGate />
          <CityDialog />
          <SiteHeader />
          {/* Necessário: as páginas filhas são renderizadas aqui. */}
          <Outlet />
          <SiteFooter />
        </CityProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}
