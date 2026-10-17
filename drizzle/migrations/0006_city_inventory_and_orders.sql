-- ============================================================
-- Pantanal Smoke: Separação de Produtos, Preços e Estoque por Cidade
-- Cidades: Cuiabá (cuiaba) e São Paulo (sao-paulo)
-- ============================================================

-- 1. Tabela de inventário, preço e estoque independente por cidade
create table if not exists public.product_city_inventories (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  city_id text not null check (city_id in ('cuiaba', 'sao-paulo')),
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 15 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, city_id)
);

-- Índices para consultas de alta performance no catálogo
create index if not exists idx_product_city_inventories_city
  on public.product_city_inventories(city_id);

create index if not exists idx_product_city_inventories_product
  on public.product_city_inventories(product_id);

create index if not exists idx_product_city_inventories_active_stock
  on public.product_city_inventories(city_id, active, stock);

-- Permissões e RLS
grant select on public.product_city_inventories to anon, authenticated;
grant all on public.product_city_inventories to authenticated, service_role;

alter table public.product_city_inventories enable row level security;

-- Políticas de RLS
drop policy if exists "inventories: visualizacao publica de ativos" on public.product_city_inventories;
create policy "inventories: visualizacao publica de ativos"
  on public.product_city_inventories for select to anon, authenticated
  using (active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "inventories: admin gerencia tudo" on public.product_city_inventories;
create policy "inventories: admin gerencia tudo"
  on public.product_city_inventories for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 2. Migração segura dos produtos existentes:
-- Inicializa cada produto com 15 unidades de estoque em Cuiabá e em São Paulo, preservando o preço e status atuais.
insert into public.product_city_inventories (product_id, city_id, price, stock, active)
select id, 'cuiaba', price, 15, active
from public.products
on conflict (product_id, city_id) do nothing;

insert into public.product_city_inventories (product_id, city_id, price, stock, active)
select id, 'sao-paulo', price, 15, active
from public.products
on conflict (product_id, city_id) do nothing;

-- 3. Registro explícito de cidade nos pedidos
alter table public.orders
  add column if not exists city_id text not null default 'cuiaba'
  check (city_id in ('cuiaba', 'sao-paulo'));

create index if not exists idx_orders_city_id
  on public.orders(city_id);

-- 4. Atualização da função RPC place_order para considerar cidade e estoque
create or replace function public.place_order(
  _items jsonb,
  _use_cashback boolean default false,
  _name text default '',
  _phone text default '',
  _address text default '',
  _city_id text default 'cuiaba'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_subtotal numeric := 0;
  v_balance numeric := 0;
  v_used numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_pname text;
  v_price numeric;
  v_qty numeric;
  v_stock integer;
  v_target_city text;
begin
  if v_uid is null then
    raise exception 'É preciso entrar na conta para enviar um pedido.';
  end if;

  v_target_city := lower(trim(coalesce(_city_id, 'cuiaba')));
  if v_target_city not in ('cuiaba', 'sao-paulo') then
    v_target_city := 'cuiaba';
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;

  for v_line in select * from jsonb_array_elements(_items) loop
    v_qty := coalesce(nullif((v_line->>'qty')::numeric, 0), 1);

    -- Busca dados e preço específico da cidade
    select p.name, coalesce(inv.price, p.price), coalesce(inv.stock, 15)
      into v_pname, v_price, v_stock
    from public.products p
    left join public.product_city_inventories inv
      on inv.product_id = p.id and inv.city_id = v_target_city and inv.active = true
    where p.id = (v_line->>'id')::uuid
      and p.active = true;

    if v_pname is null then
      raise exception 'Um dos produtos não está disponível na cidade selecionada.';
    end if;

    if v_stock < v_qty then
      raise exception 'Estoque insuficiente para o produto "%" na cidade selecionada.', v_pname;
    end if;

    -- Baixa segura no estoque da cidade
    update public.product_city_inventories
    set stock = stock - v_qty,
        updated_at = now()
    where product_id = (v_line->>'id')::uuid
      and city_id = v_target_city;

    v_subtotal := v_subtotal + v_qty * v_price;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_line->>'id',
      'name', v_pname,
      'qty', v_qty,
      'price', v_price,
      'city_id', v_target_city
    ));
  end loop;

  v_balance := coalesce(public.my_cashback(), 0);
  if _use_cashback then
    v_used := least(v_balance, v_subtotal);
  end if;
  v_total := v_subtotal - v_used;

  insert into public.orders (
    user_id,
    customer_name,
    phone,
    address,
    city_id,
    items,
    subtotal,
    cashback_used,
    total
  )
  values (
    v_uid,
    trim(_name),
    trim(_phone),
    trim(_address),
    v_target_city,
    v_lines,
    v_subtotal,
    v_used,
    v_total
  )
  returning id into v_order_id;

  if v_used > 0 then
    insert into public.cashback_entries (user_id, order_id, amount, kind, note)
    values (v_uid, v_order_id, -v_used, 'used', 'Cashback aplicado no pedido');
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'city_id', v_target_city,
    'items', v_lines,
    'subtotal', v_subtotal,
    'cashback_used', v_used,
    'total', v_total
  );
end;
$$;
