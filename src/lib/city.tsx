import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";

import { useSafeCart } from "@/lib/cart";

export type CityId = "cuiaba" | "sao-paulo";

export type CityOption = {
  id: CityId;
  name: string;
  state: string;
  shortState: string;
  buttonText: string;
};

export const CITIES: Record<CityId, CityOption> = {
  cuiaba: {
    id: "cuiaba",
    name: "Cuiabá",
    state: "Mato Grosso - MT",
    shortState: "MT",
    buttonText: "Selecionar Cuiabá",
  },
  "sao-paulo": {
    id: "sao-paulo",
    name: "São Paulo",
    state: "São Paulo - SP",
    shortState: "SP",
    buttonText: "Selecionar São Paulo",
  },
};

export const CITY_STORAGE_KEY = "pantanal-selected-city";

type CityContextValue = {
  selectedCity: CityOption | null;
  selectedCityId: CityId | null;
  selectCity: (id: CityId, force?: boolean) => void;
  clearCity: () => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
  openSelector: (destination?: string) => void;
  closeSelector: () => void;
  requireCityOrNavigate: (destination: string, e?: React.MouseEvent) => boolean;
  pendingDestination: string | null;
  isLoaded: boolean;
  pendingCitySwitch: CityId | null;
  confirmCitySwitch: () => void;
  cancelCitySwitch: () => void;
};

const CityContext = createContext<CityContextValue | null>(null);

function readStoredCity(): CityId | null {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    if (raw === "cuiaba" || raw === "sao-paulo") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const safeCart = useSafeCart();
  const [cityId, setCityId] = useState<CityId | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);
  const [pendingCitySwitch, setPendingCitySwitch] = useState<CityId | null>(null);

  useEffect(() => {
    const stored = readStoredCity();
    setCityId(stored);
    setIsLoaded(true);
  }, []);

  const openSelector = useCallback((destination?: string) => {
    if (destination) {
      setPendingDestination(destination);
    }
    setIsSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    setIsSelectorOpen(false);
    setPendingDestination(null);
    setPendingCitySwitch(null);
  }, []);

  const applyCitySelection = useCallback(
    (id: CityId) => {
      setCityId(id);
      try {
        localStorage.setItem(CITY_STORAGE_KEY, id);
      } catch {
        // storage unavailable
      }
      setIsSelectorOpen(false);
      setPendingCitySwitch(null);

      if (pendingDestination) {
        const dest = pendingDestination;
        setPendingDestination(null);
        navigate({ to: dest as any });
      }
    },
    [pendingDestination, navigate],
  );

  const selectCity = useCallback(
    (id: CityId, force = false) => {
      // Se houver produtos no carrinho e a cidade for alterada, solicita confirmação
      if (!force && safeCart && safeCart.items.length > 0 && cityId && cityId !== id) {
        setPendingCitySwitch(id);
        setIsSelectorOpen(true);
        return;
      }

      applyCitySelection(id);
    },
    [safeCart, cityId, applyCitySelection],
  );

  const confirmCitySwitch = useCallback(() => {
    if (pendingCitySwitch) {
      safeCart?.clear();
      applyCitySelection(pendingCitySwitch);
    }
  }, [pendingCitySwitch, safeCart, applyCitySelection]);

  const cancelCitySwitch = useCallback(() => {
    setPendingCitySwitch(null);
  }, []);

  const clearCity = useCallback(() => {
    setCityId(null);
    try {
      localStorage.removeItem(CITY_STORAGE_KEY);
    } catch {
      // storage unavailable
    }
  }, []);

  const requireCityOrNavigate = useCallback(
    (destination: string, e?: React.MouseEvent): boolean => {
      if (!cityId) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setPendingDestination(destination);
        setIsSelectorOpen(true);
        return false;
      }
      return true;
    },
    [cityId],
  );

  const selectedCity = useMemo(() => (cityId ? CITIES[cityId] : null), [cityId]);

  const value = useMemo<CityContextValue>(
    () => ({
      selectedCity,
      selectedCityId: cityId,
      selectCity,
      clearCity,
      isSelectorOpen,
      setIsSelectorOpen,
      openSelector,
      closeSelector,
      requireCityOrNavigate,
      pendingDestination,
      isLoaded,
      pendingCitySwitch,
      confirmCitySwitch,
      cancelCitySwitch,
    }),
    [
      selectedCity,
      cityId,
      selectCity,
      clearCity,
      isSelectorOpen,
      setIsSelectorOpen,
      openSelector,
      closeSelector,
      requireCityOrNavigate,
      pendingDestination,
      isLoaded,
      pendingCitySwitch,
      confirmCitySwitch,
      cancelCitySwitch,
    ],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error("useCity deve ser usado dentro de um CityProvider");
  }
  return ctx;
}
