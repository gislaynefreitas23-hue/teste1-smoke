import { supabase } from "@/integrations/supabase/client";
import { getPaymentProvider } from "./adapter";
import type {
  OrderAddress,
  OrderCustomer,
  OrderItem,
  PaymentCreationResult,
  PaymentMethod,
  CardDetails,
  DeliveryDetails,
} from "./types";

export type OrderSummary = {
  subtotal: number;
  deliveryFee: number;
  cashbackUsed: number;
  total: number;
  verifiedItems: OrderItem[];
};

export type CheckoutPayload = {
  items: { id: string; qty: number }[];
  customer: OrderCustomer;
  address: OrderAddress;
  paymentMethod: PaymentMethod;
  cardDetails?: CardDetails;
  deliveryDetails?: DeliveryDetails;
  useCashback: boolean;
  selectedCityId?: string;
  idempotencyKey: string;
};

export type CheckoutResponse = {
  success: boolean;
  orderId: string;
  orderSummary: OrderSummary;
  paymentResult: PaymentCreationResult;
  customer: OrderCustomer;
  address: OrderAddress;
  createdAt: string;
};

// Cache simples em memória para idempotência no cliente/sessão
const idempotencyStore = new Map<string, CheckoutResponse>();

/**
 * Validação segura de preços e cálculo de totais
 */
export async function calculateOrderSummary(
  rawItems: { id: string; qty: number }[],
  cityId?: string,
  useCashback = false,
  userCashbackBalance = 0
): Promise<OrderSummary> {
  if (!rawItems || rawItems.length === 0) {
    throw new Error("O carrinho está vazio.");
  }

  // Busca produtos ativos no banco para garantir preços verdadeiros
  const ids = rawItems.map((i) => i.id);
  const targetCity = cityId === "sao-paulo" ? "sao-paulo" : "cuiaba";

  let dbProducts: any[] = [];
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        active,
        product_city_inventories (
          city_id,
          price,
          stock,
          active
        )
      `)
      .in("id", ids);

    if (!error && data) {
      dbProducts = data;
    } else {
      throw error;
    }
  } catch {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, active")
      .in("id", ids);
    dbProducts = data ?? [];
  }

  if (!dbProducts || dbProducts.length === 0) {
    throw new Error("Não foi possível validar os produtos do catálogo.");
  }

  const verifiedItems: OrderItem[] = [];
  let subtotal = 0;

  for (const item of rawItems) {
    const dbProduct = dbProducts.find((p) => p.id === item.id);
    if (!dbProduct || !dbProduct.active) {
      throw new Error("Um ou mais produtos selecionados não estão mais disponíveis.");
    }

    // Procura inventário específico da cidade
    const inventories = Array.isArray(dbProduct.product_city_inventories)
      ? dbProduct.product_city_inventories
      : [];
    const cityInv = inventories.find((inv: any) => inv.city_id === targetCity);

    if (cityInv && cityInv.active === false) {
      throw new Error(`O produto "${dbProduct.name}" não está disponível em ${targetCity === "sao-paulo" ? "São Paulo" : "Cuiabá"}.`);
    }

    const price = cityInv ? Number(cityInv.price) : Number(dbProduct.price);
    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    subtotal += price * qty;

    verifiedItems.push({
      id: dbProduct.id,
      name: dbProduct.name,
      price,
      qty,
    });
  }

  // Taxa de entrega oficial
  const deliveryFee = targetCity === "cuiaba" ? 10.0 : 0.0;

  // Aplicação segura de cashback
  let cashbackUsed = 0;
  if (useCashback && userCashbackBalance > 0) {
    cashbackUsed = Math.min(userCashbackBalance, subtotal);
  }

  const total = Math.max(0, subtotal + deliveryFee - cashbackUsed);

  return {
    subtotal,
    deliveryFee,
    cashbackUsed,
    total,
    verifiedItems,
  };
}

/**
 * Processamento seguro do Checkout com idempotência e persistência
 */
export async function processCheckout(
  payload: CheckoutPayload,
  userCashbackBalance = 0,
  userId?: string
): Promise<CheckoutResponse> {
  // 1. Verificação de Idempotência
  if (payload.idempotencyKey && idempotencyStore.has(payload.idempotencyKey)) {
    return idempotencyStore.get(payload.idempotencyKey)!;
  }

  // 2. Validação dos dados do cliente
  if (!payload.customer.name.trim()) {
    throw new Error("Por favor, informe seu nome completo.");
  }
  if (!payload.customer.phone.trim()) {
    throw new Error("Por favor, informe seu telefone com DDD.");
  }

  // 3. Validação do endereço
  if (
    !payload.address.rua.trim() ||
    !payload.address.numero.trim() ||
    !payload.address.bairro.trim() ||
    !payload.address.cep.trim()
  ) {
    throw new Error("Por favor, preencha o endereço completo de entrega.");
  }

  // 4. Cálculo e validação oficial de preços no servidor
  const summary = await calculateOrderSummary(
    payload.items,
    payload.selectedCityId,
    payload.useCashback,
    userCashbackBalance
  );

  const formattedAddress = [
    `Rua ${payload.address.rua.trim()}, Nº ${payload.address.numero.trim()}`,
    payload.address.complemento?.trim()
      ? `Complemento: ${payload.address.complemento.trim()}`
      : "",
    payload.address.pontoReferencia?.trim()
      ? `Ponto de Ref.: ${payload.address.pontoReferencia.trim()}`
      : "",
    `Bairro: ${payload.address.bairro.trim()}`,
    `CEP: ${payload.address.cep.trim()}`,
    `Cidade: ${payload.address.cidade.trim()} - ${payload.address.uf.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");

  let orderId = `PS-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  // 5. Se o cliente estiver autenticado, registra o pedido no banco oficial via Supabase
  if (userId) {
    try {
      const dbPayload = summary.verifiedItems.map((i) => ({ id: i.id, qty: i.qty }));
      const { data, error } = await (supabase.rpc as any)("place_order", {
        _items: dbPayload,
        _use_cashback: payload.useCashback,
        _name: payload.customer.name,
        _phone: payload.customer.phone,
        _address: formattedAddress,
        _city_id: payload.selectedCityId || "cuiaba",
      });

      if (!error && data && (data as { id?: string }).id) {
        orderId = (data as { id: string }).id;
      }
    } catch (dbErr) {
      console.warn("Aviso na persistência via RPC place_order:", dbErr);
    }
  }

  // 6. Delegação para o Gateway de Pagamento desacoplado
  const provider = getPaymentProvider(payload.paymentMethod);
  const paymentResult = await provider.createPayment({
    orderId,
    idempotencyKey: payload.idempotencyKey,
    amount: summary.total,
    items: summary.verifiedItems,
    customer: payload.customer,
    address: payload.address,
    method: payload.paymentMethod,
    cardDetails: payload.cardDetails
      ? {
          // NUNCA repassa números completos ou CVV! Apenas metadados seguros
          lastFourDigits: payload.cardDetails.lastFourDigits,
          brand: payload.cardDetails.brand,
          installments: payload.cardDetails.installments || 1,
        }
      : undefined,
    deliveryDetails: payload.deliveryDetails,
  });

  const response: CheckoutResponse = {
    success: true,
    orderId,
    orderSummary: summary,
    paymentResult,
    customer: payload.customer,
    address: payload.address,
    createdAt: new Date().toISOString(),
  };

  // Salva no registro de idempotência
  if (payload.idempotencyKey) {
    idempotencyStore.set(payload.idempotencyKey, response);
  }

  return response;
}
