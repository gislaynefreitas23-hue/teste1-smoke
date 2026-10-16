import { MapPin, X } from "lucide-react";
import { useEffect } from "react";
import { CityCards } from "@/components/CityCards";
import { useCity } from "@/lib/city";

export function CityDialog() {
  const { isSelectorOpen, closeSelector, selectedCity, pendingDestination } = useCity();

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

      <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 sm:p-10 text-center shadow-2xl shadow-primary/20">
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
      </div>
    </div>
  );
}
