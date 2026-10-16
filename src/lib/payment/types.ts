export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "delivery";

export type PaymentStatus =
  | "aguardando_pagamento"
  | "aprovado"
  | "recusado"
  | "expirado"
  | "cancelado";

export type DeliveryPaymentType = "dinheiro" | "maquininha";

export type OrderCustomer = {
  name: string;
  phone: string;
  email?: string;
};

export type OrderAddress = {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  pontoReferencia?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type OrderItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

export type CardDetails = {
  token?: string;
  installments?: number;
  lastFourDigits?: string;
  brand?: string;
};

export type DeliveryDetails = {
  type: DeliveryPaymentType;
  needsChange?: boolean;
  changeFor?: number;
};

export type PaymentCreationRequest = {
  orderId: string;
  idempotencyKey: string;
  amount: number;
  items: OrderItem[];
  customer: OrderCustomer;
  address: OrderAddress;
  method: PaymentMethod;
  cardDetails?: CardDetails;
  deliveryDetails?: DeliveryDetails;
  returnUrl?: string;
};

export type PaymentCreationResult = {
  paymentId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  pixCode?: string;
  pixQrCodeBase64?: string;
  instructions?: string;
  isTestMode: boolean;
  gatewayName: string;
  createdAt: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(req: PaymentCreationRequest): Promise<PaymentCreationResult>;
  getPaymentStatus?(paymentId: string): Promise<PaymentStatus>;
  verifyWebhook?(request: Request): Promise<{
    paymentId: string;
    status: PaymentStatus;
    rawPayload: unknown;
  } | null>;
}
