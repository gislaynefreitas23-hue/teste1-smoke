import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CART_KEY } from "@/lib/brasa";
import { CartNotification } from "@/components/CartNotification";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  cityId?: "cuiaba" | "sao-paulo";
  stock?: number;
  imageUrl?: string;
};

export type CartContextValue = {
  items: CartItem[];
  add: (item: {
    id: string;
    name: string;
    price: number;
    cityId?: "cuiaba" | "sao-paulo";
    stock?: number;
    imageUrl?: string;
  }) => boolean;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  cartCityId: ("cuiaba" | "sao-paulo") | null;
  cityConflictWarning: string | null;
  dismissCityConflictWarning: () => void;
  lastAddedProduct: string | null;
  isNotificationVisible: boolean;
  dismissNotification: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

const CART_EVENT_NAME = "pantanal_cart_updated";

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          !!i &&
          typeof i.id === "string" &&
          typeof i.name === "string" &&
          Number.isFinite(Number(i.price)) &&
          Number(i.qty) > 0,
      )
      .map((i) => ({
        id: i.id,
        name: i.name,
        price: Number(i.price),
        qty: Number(i.qty),
        cityId: i.cityId === "sao-paulo" || i.cityId === "cuiaba" ? i.cityId : undefined,
        stock: Number.isFinite(Number(i.stock)) ? Number(i.stock) : undefined,
        imageUrl: typeof i.imageUrl === "string" ? i.imageUrl : undefined,
      }));
  } catch {
    return [];
  }
}

function writeStoredCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CART_EVENT_NAME));
  } catch (e) {
    console.error("Erro ao persistir carrinho:", e);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Estado da notificação fixa inferior
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [cityConflictWarning, setCityConflictWarning] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissNotification = useCallback(() => {
    setIsNotificationVisible(false);
  }, []);

  const dismissCityConflictWarning = useCallback(() => {
    setCityConflictWarning(null);
  }, []);

  const triggerNotification = useCallback((productName: string) => {
    // Se outro produto for adicionado no intervalo, cancela o timer anterior
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Atualiza imediatamente o produto e exibe a notificação
    setLastAddedProduct(productName);
    setIsNotificationVisible(true);

    // Reinicia o tempo para permanecer exatamente 3 segundos (3000ms)
    timerRef.current = setTimeout(() => {
      setIsNotificationVisible(false);
    }, 3000);
  }, []);

  // Cleanup de timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // O carrinho vive no navegador: ler no primeiro render causaria divergência
  // entre o HTML do servidor e o do cliente.
  useEffect(() => {
    setItems(readStoredCart());
    setLoaded(true);
  }, []);

  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Persiste no localStorage sempre que os itens mudarem após a carga inicial
  useEffect(() => {
    if (!loaded) return;
    writeStoredCart(items);
  }, [items, loaded]);

  // Sincroniza abas e componentes em tempo real quando o localStorage mudar
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === CART_KEY) {
        const stored = readStoredCart();
        itemsRef.current = stored;
        setItems(stored);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const add = useCallback(
    (item: {
      id: string;
      name: string;
      price: number;
      cityId?: "cuiaba" | "sao-paulo";
      stock?: number;
      imageUrl?: string;
    }): boolean => {
      const current = itemsRef.current;

      // 1. Verifica se já existem produtos de outra cidade no carrinho
      const existingCity = current.find((i) => i.cityId)?.cityId;
      if (existingCity && item.cityId && existingCity !== item.cityId) {
        const currentCityName = existingCity === "cuiaba" ? "Cuiabá" : "São Paulo";
        const newCityName = item.cityId === "cuiaba" ? "Cuiabá" : "São Paulo";
        setCityConflictWarning(
          `Seu carrinho contém produtos de ${currentCityName}. Não é permitido misturar itens de cidades diferentes no mesmo pedido. Para comprar em ${newCityName}, limpe o carrinho ou conclua o pedido atual.`,
        );
        return false;
      }

      const existing = current.find((i) => i.id === item.id);
      const maxStock = typeof item.stock === "number" ? item.stock : 9999;

      if (existing) {
        if (existing.qty >= maxStock) {
          triggerNotification(`${item.name} (limite de estoque atingido)`);
          return true;
        }
        const updated = current.map((i) =>
          i.id === item.id
            ? { ...i, qty: i.qty + 1, imageUrl: item.imageUrl || i.imageUrl }
            : i
        );
        itemsRef.current = updated;
        setItems(updated);
        writeStoredCart(updated);
        triggerNotification(item.name);
        return true;
      }

      if (maxStock <= 0) {
        triggerNotification(`${item.name} (esgotado)`);
        return false;
      }

      const updated = [
        ...current,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          cityId: item.cityId,
          stock: item.stock,
          imageUrl: item.imageUrl,
        },
      ];
      itemsRef.current = updated;
      setItems(updated);
      writeStoredCart(updated);
      triggerNotification(item.name);
      return true;
    },
    [triggerNotification],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((current) => {
      const updated =
        qty <= 0
          ? current.filter((i) => i.id !== id)
          : current.map((i) => {
              if (i.id !== id) return i;
              const max = typeof i.stock === "number" ? i.stock : 9999;
              return { ...i, qty: Math.min(qty, max) };
            });
      itemsRef.current = updated;
      writeStoredCart(updated);
      return updated;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => {
      const updated = current.filter((i) => i.id !== id);
      itemsRef.current = updated;
      writeStoredCart(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    setCityConflictWarning(null);
    writeStoredCart([]);
  }, []);

  const cartCityId = useMemo(() => {
    return items.find((i) => i.cityId)?.cityId || null;
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: items.reduce((sum, i) => sum + i.qty * i.price, 0),
      cartCityId,
      cityConflictWarning,
      dismissCityConflictWarning,
      lastAddedProduct,
      isNotificationVisible,
      dismissNotification,
    }),
    [
      items,
      add,
      setQty,
      remove,
      clear,
      cartCityId,
      cityConflictWarning,
      dismissCityConflictWarning,
      lastAddedProduct,
      isNotificationVisible,
      dismissNotification,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartNotification
        productName={lastAddedProduct}
        isVisible={isNotificationVisible}
        onDismiss={dismissNotification}
      />
    </CartContext.Provider>
  );
}

export function useSafeCart() {
  return useContext(CartContext);
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
