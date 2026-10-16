-- ============================================================
-- Pantanal Smoke: Migração de suporte a checkout e pagamentos
-- ============================================================

-- 1. Status de pagamento padronizados
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_payment_status') then
    create type public.order_payment_status as enum (
      'aguardando_pagamento',
      'aprovado',
      'recusado',
      'expirado',
      'cancelado'
    );
  end if;
end $$;

-- 2. Adição de colunas de pagamento e idempotência na tabela de pedidos
alter table public.orders
  add column if not exists payment_method text not null default 'pix',
  add column if not exists payment_status text not null default 'aguardando_pagamento'
    check (payment_status in ('aguardando_pagamento', 'aprovado', 'recusado', 'expirado', 'cancelado')),
  add column if not exists payment_id text not null default '',
  add column if not exists idempotency_key text,
  add column if not exists pix_code text,
  add column if not exists pix_qr_code text;

-- Índice único para prevenção de cobranças e pedidos duplicados (idempotência)
create unique index if not exists idx_orders_idempotency_key
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Índice para busca rápida de pedidos por ID da transação no gateway
create index if not exists idx_orders_payment_id
  on public.orders (payment_id)
  where payment_id <> '';
