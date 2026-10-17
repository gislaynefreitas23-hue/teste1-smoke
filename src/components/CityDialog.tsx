import { AlertTriangle, MapPin, X } from "lucide-react";
import { useEffect } from "react";
import { CityCards } from "@/components/CityCards";
import { Button } from "@/components/ui/button";
import { CITIES, useCity } from "@/lib/city";
import { useSafeCart } from "@/lib/cart";

export function CityDialog() {
  const {
    isSelectorOpen,
    closeSelector,
    selectedCity,
    pendingDestination,
    pendingCitySwitch,
    confirmCitySwitch,
    cancelCitySwitch,
  } = useCity();

  const cart = useSafeCart();

  // Fecha no ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isSelectorOpen) {
        closeSelector();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectorOpen, closeSelector]);

  if (!isSelectorOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0 -z-10"
        onClick={closeSelector}
        aria-hidden="true"
      />

      <div className="relative my-4 sm:my-8 w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/30 bg-card p-4 sm:p-10 text-center shadow-2xl shadow-primary/20">
        {/* Luz ambiente neon roxa */}
        <div
          className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />

        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={closeSelector}
          aria-label="Fechar seleção de cidade"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {pendingCitySwitch ? (
          /* Diálogo de Confirmação para Troca de Cidade com Carrinho Ativo */
          <div className="mx-auto max-w-md py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h2
              id="city-dialog-title"
              className="text-2xl font-bold tracking-tight text-white"
            >
              Trocar de Região?
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Você possui <strong className="text-white">{cart?.count ?? 0} item(ns)</strong> no carrinho adicionados para{" "}
              <strong className="text-primary">{selectedCity?.name}</strong>.
            </p>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200 text-left">
              Não é possível misturar itens de Cuiabá e São Paulo no mesmo pedido. Ao mudar para{" "}
              <strong>{CITIES[pendingCitySwitch]?.name}</strong>, seu carrinho atual será esvaziado para exibir os produtos e preços da nova cidade.
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={cancelCitySwitch}
                className="text-xs"
              >
                Cancelar e Manter {selectedCity?.name}
              </Button>
              <Button
                type="button"
                onClick={confirmCitySwitch}
                className="bg-ember hover:bg-ember/90 text-primary-foreground text-xs font-bold shadow-glow"
              >
                Esvaziar e Mudar para {CITIES[pendingCitySwitch]?.name}
              </Button>
            </div>
          </div>
        ) : (
          /* Seleção Normal de Cidade */
          <>
            <div className="mx-auto max-w-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <MapPin className="h-3.5 w-3.5" />
                <span>Selecione sua Região</span>
              </div>

              <h2
                id="city-dialog-title"
                className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                Estamos presentes em <span className="text-ember">Cuiabá</span> e{" "}
                <span className="text-ember">São Paulo</span>
              </h2>

              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {pendingDestination === "/produtos"
                  ? "Escolha sua cidade para consultar os produtos e condições disponíveis para sua região."
                  : pendingDestination === "/recomendar"
                  ? "Escolha sua cidade para consultar as melhores sugestões para sua região."
                  : "Escolha sua cidade para consultar as informações de atendimento e as condições disponíveis para sua região."}
              </p>

              {selectedCity && (
                <p className="mt-2 text-xs text-primary font-medium">
                  Região atual: {selectedCity.name} - {selectedCity.shortState}
                </p>
              )}
            </div>

            <div className="mt-8 text-left">
              <CityCards onSelected={() => closeSelector()} compact />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
