-- ============================================================
-- Pantanal Smoke: Tabela de Endereços de Clientes e Entrega Segura
-- Permite salvar e reutilizar múltiplos endereços por cidade
-- ============================================================

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  city_id text not null check (city_id in ('cuiaba', 'sao-paulo')),
  label text not null default 'Principal', -- Ex: Casa, Trabalho, Apartamento
  cep text not null,
  rua text not null,
  numero text not null,
  bairro text not null,
  cidade text not null,
  uf text not null,
  complemento text not null default '',
  ponto_referencia text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices para buscas rápidas de endereços do cliente filtradas por cidade
create index if not exists idx_customer_addresses_user_city
  on public.customer_addresses(user_id, city_id);

create index if not exists idx_customer_addresses_created_at
  on public.customer_addresses(created_at desc);

-- RLS (Row Level Security)
alter table public.customer_addresses enable row level security;

grant select, insert, update, delete on public.customer_addresses to authenticated;
grant all on public.customer_addresses to service_role;

-- Políticas de segurança: o cliente só acessa, cadastra, edita e remove seus próprios endereços
drop policy if exists "addresses: cliente acessa apenas seus proprios enderecos" on public.customer_addresses;
create policy "addresses: cliente acessa apenas seus proprios enderecos"
  on public.customer_addresses for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
