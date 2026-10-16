import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Navigation,
  QrCode,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, WHATSAPP_NUMBER } from "@/lib/brasa";
import { useCart } from "@/lib/cart";
import { useCity } from "@/lib/city";
import { useAuthSession } from "@/lib/useAuth";
import {
  processCheckout,
  type CheckoutResponse,
} from "@/lib/payment/service";
import type { PaymentMethod, DeliveryPaymentType } from "@/lib/payment/types";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar Compra — Pantanal Smoke" },
      {
        name: "description",
        content: "Checkout seguro da Pantanal Smoke. Pagamento via Pix, cartão ou na entrega.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, clear } = useCart();
  const { session } = useAuthSession();
  const { selectedCity, selectedCityId } = useCity();

  // Cidade e estado definidos no site
  const defaultCity =
    selectedCity?.name || (selectedCityId === "sao-paulo" ? "São Paulo" : "Cuiabá");
  const defaultUf =
    selectedCity?.shortState || (selectedCityId === "sao-paulo" ? "SP" : "MT");

  // Coordenadas iniciais centralizadas em Cuiabá
  const initialLat = selectedCityId === "sao-paulo" ? -23.5505 : -15.6014;
  const initialLng = selectedCityId === "sao-paulo" ? -46.6333 : -56.0979;

  // Campos do formulário
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email] = useState(session?.user?.email ?? "");

  // Endereço de entrega
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);

  // Campos específicos solicitados: CEP, RUA, BAIRRO, NUMERO
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");

  // Forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [deliveryType, setDeliveryType] = useState<DeliveryPaymentType>("maquininha");
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");

  // Dados de Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);

  // Cashback do cliente logado
  const [balance, setBalance] = useState(0);
  const [useCashback, setUseCashback] = useState(false);

  // Estados de submissão e confirmação
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<CheckoutResponse | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const isCuiaba = selectedCityId === "cuiaba" || defaultCity.toLowerCase().includes("cuiab");
  const deliveryFee = 10; // Taxa fixa de R$ 10,00 para toda Cuiabá
  const rawSubtotal = items.reduce((acc, i) => acc + i.price * i.qty, 0);
  const appliedCashback = useCashback ? Math.min(balance, rawSubtotal) : 0;
  const estimatedTotal = Math.max(0, rawSubtotal + deliveryFee - appliedCashback);

  // Carrega saldo de cashback caso o cliente esteja logado
  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase
      .rpc("my_cashback")
      .then(({ data }) => {
        if (active && typeof data === "number") setBalance(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  // Pré-carrega perfil salvo se houver
  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase
      .from("profiles")
      .select("name")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.name) setName((prev) => prev || data.name);
      });
    return () => {
      active = false;
    };
  }, [session]);

  // Pesquisa de localização por rua, número, bairro ou CEP
  async function handleSearchLocation(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearchingLocation(true);
    setLocationError(null);

    try {
      const cleanCep = query.replace(/\D/g, "");
      if (cleanCep.length === 8) {
        const resCep = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const dataCep = await resCep.json();
        if (!dataCep.erro) {
          if (dataCep.logradouro) setRua(dataCep.logradouro);
          if (dataCep.bairro) setBairro(dataCep.bairro);
          setCep(`${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`);

          const nominatimQuery = `${dataCep.logradouro}, ${dataCep.bairro}, ${defaultCity}, Brasil`;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nominatimQuery)}&limit=1`
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            setCoords({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
          }
          setIsAddressConfirmed(true);
          setIsSearchingLocation(false);
          return;
        }
      }

      const nominatimQuery = `${query}, ${defaultCity}, ${defaultUf}, Brasil`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
          nominatimQuery
        )}&countrycodes=br&limit=1`
      );
      const data = await res.json();

      if (!data || data.length === 0) {
        setLocationError(
          `Local não encontrado em ${defaultCity}. Tente buscar pelo CEP ou nome da rua/bairro.`
        );
        return;
      }

      const item = data[0];
      setCoords({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });

      const road = item.address?.road || item.address?.pedestrian || item.address?.street || "";
      const suburb = item.address?.suburb || item.address?.neighbourhood || item.address?.city_district || "";
      const postcode = item.address?.postcode || "";
      const houseNumber = item.address?.house_number || "";

      if (road) setRua(road);
      if (suburb) setBairro(suburb);
      if (postcode) setCep(postcode);
      if (houseNumber) setNumero(houseNumber);

      setIsAddressConfirmed(true);
    } catch {
      setLocationError("Não foi possível buscar a localização no mapa. Você pode preencher os campos abaixo.");
    } finally {
      setIsSearchingLocation(false);
    }
  }

  // Obter localização atual do dispositivo via navegador
  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await res.json();
          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || "";
            const suburb = data.address.suburb || data.address.neighbourhood || "";
            const postcode = data.address.postcode || "";
            const houseNumber = data.address.house_number || "";

            if (road) setRua(road);
            if (suburb) setBairro(suburb);
            if (postcode) setCep(postcode);
            if (houseNumber) setNumero(houseNumber);
          }
          setIsAddressConfirmed(true);
        } catch {
          setIsAddressConfirmed(true);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Permissão de localização não concedida. Utilize a pesquisa manual por rua ou CEP."
          );
        } else {
          setLocationError("Não foi possível obter sua localização atual.");
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Submissão do Checkout
  async function handleSubmitCheckout(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError("Seu carrinho está vazio.");
      return;
    }

    if (!phone.trim()) {
      setFormError("Informe seu telefone pra contato.");
      return;
    }

    if (!cep.trim()) {
      setFormError("Informe o CEP.");
      return;
    }

    if (!rua.trim()) {
      setFormError("Informe o nome da rua / avenida.");
      return;
    }

    if (!bairro.trim()) {
      setFormError("Informe o bairro.");
      return;
    }

    if (!numero.trim()) {
      setFormError("Informe o número do imóvel.");
      return;
    }

    if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
      if (cardNumber.replace(/\D/g, "").length < 13 || !cardHolder || !cardExpiry || !cardCvv) {
        setFormError("Preencha os dados do cartão corretamente.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const cleanCardLastFour = cardNumber.replace(/\D/g, "").slice(-4);

      const response = await processCheckout(
        {
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
          customer: {
            name: name.trim() || `Cliente (${phone.trim()})`,
            phone: phone.trim(),
            email,
          },
          address: {
            cep,
            rua,
            numero,
            bairro,
            cidade: defaultCity,
            uf: defaultUf,
          },
          paymentMethod,
          cardDetails:
            paymentMethod === "credit_card" || paymentMethod === "debit_card"
              ? {
                  lastFourDigits: cleanCardLastFour,
                  installments,
                  brand: "Mastercard/Visa",
                }
              : undefined,
          deliveryDetails:
            paymentMethod === "delivery"
              ? {
                  type: deliveryType,
                  needsChange,
                  changeFor: needsChange ? Number(changeFor) : undefined,
                }
              : undefined,
          useCashback,
          selectedCityId: "cuiaba",
          idempotencyKey,
        },
        balance,
        session?.user?.id
      );

      clear();
      setConfirmedOrder(response);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao processar o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyPixCode() {
    if (!confirmedOrder?.paymentResult.pixCode) return;
    navigator.clipboard.writeText(confirmedOrder.paymentResult.pixCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  }

  // --- Tela de Confirmação do Pedido ---
  if (confirmedOrder) {
    const { orderId, orderSummary, paymentResult, address, customer } = confirmedOrder;
    const isPix = paymentResult.method === "pix";
    const isDelivery = paymentResult.method === "delivery";

    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-primary/30 bg-[#15171e]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
          {/* Cabeçalho */}
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Check className="h-7 w-7 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pedido Registrado com Sucesso!
            </h1>
            <p className="mt-1 font-mono text-sm text-primary">
              Protocolo: <span className="font-bold text-white">{orderId}</span>
            </p>
          </div>

          {/* Status do Pagamento */}
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Situação: {paymentResult.status === "aguardando_pagamento" ? "Aguardando Pagamento" : paymentResult.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-200/90">
              {paymentResult.instructions}
            </p>
          </div>

          {/* Área Pix */}
          {isPix && paymentResult.pixCode && (
            <div className="mt-8 rounded-2xl border border-purple-500/30 bg-[#1c1e27] p-6 text-center shadow-lg">
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <QrCode className="h-5 w-5" />
                <span>Pague com Pix Instantâneo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Copie o código abaixo e cole no aplicativo do seu banco:
              </p>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-700 bg-black/40 p-2.5">
                <input
                  type="text"
                  readOnly
                  value={paymentResult.pixCode}
                  className="w-full bg-transparent font-mono text-xs text-slate-300 focus:outline-none"
                />
                <Button
                  size="sm"
                  onClick={copyPixCode}
                  className="bg-primary text-primary-foreground shrink-0 gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedPix ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>
          )}

          {/* Área Pagamento na Entrega */}
          {isDelivery && (
            <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-400 font-bold">
                <Truck className="h-5 w-5" />
                <span>Pagamento no Ato da Entrega</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-blue-200">
                {paymentResult.instructions}
              </p>
            </div>
          )}

          {/* Resumo do Pedido e Endereço */}
          <div className="mt-8 grid gap-6 border-t border-slate-800 pt-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Endereço de Entrega
              </h3>
              <p className="mt-2 text-sm text-white font-medium">{customer.name}</p>
              <p className="text-xs text-slate-300">Contato: {customer.phone}</p>
              <p className="mt-1 text-xs text-slate-300">
                {address.rua}, Nº {address.numero}
              </p>
              <p className="text-xs text-slate-400">
                {address.bairro} — {address.cidade}/{address.uf}
              </p>
              <p className="text-xs text-slate-400">CEP: {address.cep}</p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Valores
              </h3>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span>{formatBRL(orderSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Taxa de entrega (Cuiabá):</span>
                  <span>{formatBRL(orderSummary.deliveryFee)}</span>
                </div>
                {orderSummary.cashbackUsed > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Cashback utilizado:</span>
                    <span>-{formatBRL(orderSummary.cashbackUsed)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-700 pt-1 text-sm font-bold text-white">
                  <span>Total do Pedido:</span>
                  <span className="text-primary">{formatBRL(orderSummary.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-ember px-6">
              <Link to="/produtos">Continuar Comprando</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-slate-700 hover:bg-slate-800"
            >
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20pedido%20${orderId}`}
                target="_blank"
                rel="noreferrer"
              >
                Atendimento WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // --- Tela quando o carrinho está vazio ---
  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Adicione itens ao seu carrinho antes de prosseguir para o checkout.
        </p>
        <Button className="mt-6 bg-ember shadow-glow" asChild>
          <Link to="/produtos">Ver catálogo de produtos</Link>
        </Button>
      </main>
    );
  }

  // --- Tela Principal do Checkout ---
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/carrinho" className="hover:text-foreground">
          Carrinho
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">Checkout & Pagamento</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda: Endereço de Entrega & Pagamento */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmitCheckout} className="space-y-6">
            {/* Seção Exclusiva: Endereço de Entrega */}
            <section className="rounded-2xl border border-slate-800 bg-card/60 p-5 backdrop-blur-sm sm:p-6 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Endereço de Entrega
              </h2>

              {/* 1. Aviso que a entrega é R$ 10,00 taxa fixa para toda Cuiabá */}
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-slate-200">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                <span>
                  Entrega com <strong className="text-white font-bold">taxa fixa de R$ 10,00</strong> para toda a cidade de Cuiabá.
                </span>
              </div>

              {/* 2. Buscar no mapa / Usar minha localização */}
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar no mapa por rua, número, bairro ou CEP..."
                      className="pr-9 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSearchLocation();
                        }
                      }}
                    />
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => handleSearchLocation()}
                      disabled={isSearchingLocation}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                    >
                      {isSearchingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Buscar no mapa"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseCurrentLocation}
                      disabled={isLocating}
                      title="Usar minha localização atual"
                      className="border-slate-700 hover:bg-slate-800 text-xs gap-1.5"
                    >
                      {isLocating ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>Usar minha localização</span>
                    </Button>
                  </div>
                </div>

                {locationError && (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                    {locationError}
                  </p>
                )}

                {/* Mapa Interativo */}
                {!isAddressConfirmed ? (
                  <div className="space-y-3">
                    <div className="relative h-52 sm:h-60 w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-inner">
                      <iframe
                        title="Mapa de Entrega"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.006}%2C${coords.lat - 0.004}%2C${coords.lng + 0.006}%2C${coords.lat + 0.004}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                        className="h-full w-full border-0 pointer-events-auto"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.9)] border-2 border-white animate-bounce">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="h-2 w-2 rounded-full bg-black/60 blur-xs mt-0.5" />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => setIsAddressConfirmed(true)}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 shadow-md"
                      >
                        <Check className="h-4 w-4" />
                        Confirmar endereço no mapa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-slate-200">Localização confirmada no mapa</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddressConfirmed(false)}
                      className="border-slate-700 hover:bg-slate-800 text-xs text-slate-300"
                    >
                      <Compass className="h-3.5 w-3.5 mr-1 text-primary" />
                      Alterar localização
                    </Button>
                  </div>
                )}
              </div>

              {/* 3. Logo depois os campos: CEP, RUA, BAIRRO, NUMERO e TELEFONE PRA CONTATO */}
              <div className="border-t border-slate-800/80 pt-4 space-y-3">

                {/* CEP e RUA */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="chk-cep" className="text-xs font-bold text-foreground">
                      CEP *
                    </Label>
                    <Input
                      id="chk-cep"
                      required
                      value={cep}
                      maxLength={9}
                      onChange={(e) => setCep(e.target.value)}
                      placeholder="78000-000"
                      className="mt-1 text-sm font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="chk-rua" className="text-xs font-bold text-foreground">
                      RUA *
                    </Label>
                    <Input
                      id="chk-rua"
                      required
                      value={rua}
                      onChange={(e) => setRua(e.target.value)}
                      placeholder="Nome da rua / avenida"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>

                {/* BAIRRO, NÚMERO e TELEFONE PRA CONTATO */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="chk-bairro" className="text-xs font-bold text-foreground">
                      BAIRRO *
                    </Label>
                    <Input
                      id="chk-bairro"
                      required
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Bairro"
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="chk-numero" className="text-xs font-bold text-foreground">
                      NÚMERO *
                    </Label>
                    <Input
                      id="chk-numero"
                      required
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Ex.: 123"
                      className="mt-1 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="chk-phone" className="text-xs font-bold text-foreground">
                      TELEFONE PRA CONTATO *
                    </Label>
                    <Input
                      id="chk-phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(65) 99999-9999"
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Seção Forma de Pagamento */}
            <section className="rounded-2xl border border-slate-800 bg-card/60 p-5 backdrop-blur-sm sm:p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Forma de Pagamento
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Opção 1: Pix */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("pix")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    paymentMethod === "pix"
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-primary"
                      : "border-slate-800 bg-card/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-primary">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Pix</span>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Instantâneo
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      QR Code e Chave Copia e Cola. Liberação imediata.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Cartão de Crédito */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit_card")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    paymentMethod === "credit_card"
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-primary"
                      : "border-slate-800 bg-card/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Cartão de Crédito</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      À vista ou parcelado. Ambiente 100% criptografado.
                    </p>
                  </div>
                </button>

                {/* Opção 3: Cartão de Débito */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("debit_card")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    paymentMethod === "debit_card"
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-primary"
                      : "border-slate-800 bg-card/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Cartão de Débito</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Débito online para bandeiras compatíveis.
                    </p>
                  </div>
                </button>

                {/* Opção 4: Pagamento na Entrega */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("delivery")}
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    paymentMethod === "delivery"
                      ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-primary"
                      : "border-slate-800 bg-card/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-primary">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white">Pagar na Entrega</span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pague ao motoboy via Dinheiro ou Maquininha.
                    </p>
                  </div>
                </button>
              </div>

              {paymentMethod === "credit_card" && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Ambiente Seguro. Dados processados diretamente pelo adquirente.</span>
                  </div>
                  <div>
                    <Label className="text-xs">Número do Cartão</Label>
                    <Input
                      required
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="mt-1 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Nome no Cartão</Label>
                    <Input
                      required
                      placeholder="Como impresso no cartão"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Validade (MM/AA)</Label>
                      <Input
                        required
                        placeholder="MM/AA"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CVV</Label>
                      <Input
                        required
                        type="password"
                        placeholder="123"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Parcelamento</Label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                    >
                      <option value={1}>1x de {formatBRL(estimatedTotal)} (Sem juros)</option>
                      <option value={2}>2x de {formatBRL(estimatedTotal / 2)} (Sem juros)</option>
                      <option value={3}>3x de {formatBRL(estimatedTotal / 3)} (Sem juros)</option>
                    </select>
                  </div>
                </div>
              )}

              {paymentMethod === "delivery" && (
                <div className="mt-4 rounded-xl border border-slate-700 bg-black/40 p-4 space-y-3">
                  <Label className="text-xs">Como deseja pagar na entrega?</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="delivType"
                        checked={deliveryType === "maquininha"}
                        onChange={() => setDeliveryType("maquininha")}
                        className="accent-primary"
                      />
                      Maquininha de Cartão
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="radio"
                        name="delivType"
                        checked={deliveryType === "dinheiro"}
                        onChange={() => setDeliveryType("dinheiro")}
                        className="accent-primary"
                      />
                      Dinheiro
                    </label>
                  </div>

                  {deliveryType === "dinheiro" && (
                    <div className="pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={needsChange}
                          onChange={(e) => setNeedsChange(e.target.checked)}
                          className="accent-primary"
                        />
                        Precisa de troco?
                      </label>
                      {needsChange && (
                        <div className="mt-2">
                          <Label className="text-xs">Troco para quanto?</Label>
                          <Input
                            placeholder="Ex.: 100"
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value)}
                            className="mt-1 max-w-xs text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {formError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/15 p-4 text-xs font-semibold text-destructive">
                {formError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full bg-ember py-6 text-base font-bold shadow-glow hover:opacity-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando Pedido...
                </>
              ) : (
                <>
                  Continuar para pagamento
                  <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Coluna Direita: Resumo do Pedido */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-slate-800 bg-card/60 p-5 backdrop-blur-sm sm:p-6 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>Resumo do Pedido</span>
              <span className="text-xs font-normal text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </h2>

            {/* Lista dos Produtos */}
            <div className="mt-4 max-h-60 overflow-y-auto space-y-3 pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 truncate">
                    <p className="font-semibold text-white truncate">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.qty}x de {formatBRL(item.price)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-200">
                    {formatBRL(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Saldo de Cashback */}
            {session && balance > 0 && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Zap className="h-4 w-4" />
                    <span>Usar Cashback (Saldo: {formatBRL(balance)})</span>
                  </div>
                  <Switch
                    checked={useCashback}
                    onCheckedChange={setUseCashback}
                    aria-label="Ativar uso do saldo de cashback"
                  />
                </div>
              </div>
            )}

            {/* Linhas de Fechamento */}
            <div className="mt-5 space-y-2 border-t border-slate-800 pt-4 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal dos produtos:</span>
                <span className="text-foreground">{formatBRL(rawSubtotal)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" /> Taxa de entrega (Cuiabá):
                </span>
                <span className="text-foreground">{formatBRL(deliveryFee)}</span>
              </div>

              {appliedCashback > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Cashback aplicado:</span>
                  <span>-{formatBRL(appliedCashback)}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-slate-700/80 pt-2 text-base font-bold text-white">
                <span>Total a pagar:</span>
                <span className="text-primary">{formatBRL(estimatedTotal)}</span>
              </div>
            </div>

            {/* Selos de Confiança e Segurança */}
            <div className="mt-6 flex flex-col gap-2 rounded-xl border border-slate-800 bg-black/30 p-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Compra protegida com criptografia de ponta a ponta</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Truck className="h-4 w-4 text-primary shrink-0" />
                <span>Entrega rápida em Cuiabá e região</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
