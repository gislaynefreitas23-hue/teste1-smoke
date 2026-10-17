import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CITIES, type CityId, useCity } from "@/lib/city";

type CityCardsProps = {
  onSelected?: (cityId: CityId) => void;
  compact?: boolean;
};

export function CityCards({ onSelected, compact = false }: CityCardsProps) {
  const { selectedCityId, selectCity } = useCity();

  const handleSelect = (id: CityId) => {
    selectCity(id);
    onSelected?.(id);
  };

  const cityList = [CITIES["cuiaba"], CITIES["sao-paulo"]];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-5">
      {cityList.map((city) => {
        const isSelected = selectedCityId === city.id;

        return (
          <div
            key={city.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(city.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(city.id);
              }
            }}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border p-2.5 sm:p-8 text-left transition-all duration-300 cursor-pointer ${
              isSelected
                ? "border-primary bg-card/90 shadow-glow ring-1 ring-primary"
                : "border-border/60 bg-card/60 hover:border-primary/80 hover:bg-card/90 hover:shadow-glow hover:-translate-y-1"
            }`}
          >
            {/* Efeito sutil de luz roxo neon no topo do card */}
            <div className="pointer-events-none absolute -top-14 left-1/2 h-28 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-2xl transition-opacity duration-300 group-hover:bg-primary/25" />

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:border-primary/60 group-hover:bg-primary/20 shrink-0">
                  <MapPin className="h-4 w-4 sm:h-6 sm:w-6" aria-hidden="true" />
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-primary w-fit">
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Região ativa</span>
                    <span className="sm:hidden">Ativo</span>
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground">
                    <span className="hidden sm:inline">Atendimento local</span>
                    <span className="sm:hidden">Local</span>
                  </span>
                )}
              </div>

              <div className="mt-2.5 sm:mt-6">
                <h3 className="text-sm sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                  {city.name} <span className="text-xs sm:text-2xl text-muted-foreground sm:text-foreground">- {city.shortState}</span>
                </h3>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                  {city.state}
                </p>
                {city.id === "cuiaba" ? (
                  <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">
                    <span className="hidden sm:inline">Entrega local · Atendimento das 10h às 19h</span>
                    <span className="sm:hidden">Entrega local rápida</span>
                  </p>
                ) : (
                  <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight">
                    <span className="hidden sm:inline">Envios expressos para a capital</span>
                    <span className="sm:hidden">Envio expresso SP</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 sm:mt-8 pt-2 sm:pt-4 border-t border-border/40">
              <Button
                type="button"
                size={compact ? "default" : "lg"}
                className={`w-full h-8 sm:h-11 px-2 sm:px-4 text-[11px] sm:text-sm transition-all duration-300 font-semibold truncate ${
                  isSelected
                    ? "bg-ember text-primary-foreground shadow-glow"
                    : "bg-secondary/70 text-foreground group-hover:bg-ember group-hover:text-primary-foreground group-hover:shadow-glow"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(city.id);
                }}
              >
                <span className="hidden sm:inline">{isSelected ? `✓ ${city.name} Selecionada` : city.buttonText}</span>
                <span className="sm:hidden">{isSelected ? `✓ ${city.name}` : `Escolher`}</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
