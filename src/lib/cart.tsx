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
};

type CartContextValue = {
  items: CartItem[];
  add: (item: { id: string; name: string; price: number }) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  lastAddedProduct: string | null;
  isNotificationVisible: boolean;
  dismissNotification: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(): CartItem[] {
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
      .map((i) => ({ ...i, price: Number(i.price), qty: Number(i.qty) }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Estado da notificação fixa inferior
  const [lastAddedProduct, setLastAddedProduct] = useState<string | null>(null);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissNotification = useCallback(() => {
    setIsNotificationVisible(false);
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

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = useCallback(
    (item: { id: string; name: string; price: number }) => {
      setItems((current) => {
        const existing = current.find((i) => i.id === item.id);
        if (existing) {
          return current.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
        }
        return [...current, { ...item, qty: 1 }];
      });
      triggerNotification(item.name);
    },
    [triggerNotification],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((current) =>
      qty <= 0
        ? current.filter((i) => i.id !== id)
        : current.map((i) => (i.id === id ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add,
      setQty,
      remove,
      clear,
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal: items.reduce((sum, i) => sum + i.qty * i.price, 0),
      lastAddedProduct,
      isNotificationVisible,
      dismissNotification,
    }),
    [items, add, setQty, remove, clear, lastAddedProduct, isNotificationVisible, dismissNotification],
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

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de CartProvider");
  return ctx;
}
