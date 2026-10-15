-- ============================================================
-- Pantanal Smoke: papéis, perfis, catálogo, pedidos, cashback
-- ============================================================

-- ---------- Papéis ----------
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Verificação de papel usada pelas políticas (security definer evita recursão de RLS).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

create policy "user_roles: ver os próprios papéis"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create policy "user_roles: admin vê todos os papéis"
  on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------- Perfis ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  preferences text not null default '',
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

create policy "profiles: dono lê o próprio perfil"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles: admin lê todos os perfis"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "profiles: dono cria o próprio perfil"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy "profiles: dono atualiza o próprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Produtos ----------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null default '',
  flavor_profile text not null default '',
  intensity text not null default 'média',
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

create policy "products: qualquer pessoa vê produtos ativos"
  on public.products for select to anon, authenticated
  using (active = true or public.has_role(auth.uid(), 'admin'));

create policy "products: admin cria"
  on public.products for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "products: admin atualiza"
  on public.products for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "products: admin remove"
  on public.products for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------- Pedidos ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_name text not null default '',
  phone text not null default '',
  address text not null default '',
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'cancelado')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  cashback_used numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

create policy "orders: cliente vê os próprios pedidos"
  on public.orders for select to authenticated
  using (user_id = auth.uid());

create policy "orders: admin vê todos os pedidos"
  on public.orders for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "orders: admin atualiza status"
  on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---------- Histórico de cashback ----------
create table public.cashback_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10,2) not null,
  kind text not null check (kind in ('earned', 'used', 'adjust')),
  note text not null default '',
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.cashback_entries TO authenticated;
GRANT ALL ON public.cashback_entries TO service_role;
ALTER TABLE public.cashback_entries ENABLE ROW LEVEL SECURITY;

create policy "cashback: cliente vê o próprio histórico"
  on public.cashback_entries for select to authenticated
  using (user_id = auth.uid());

create policy "cashback: admin vê tudo"
  on public.cashback_entries for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---------- Funções ----------

-- Saldo de cashback do cliente logado.
create or replace function public.my_cashback()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)
  from public.cashback_entries
  where user_id = auth.uid()
    and kind <> 'adjust';
$$;

-- Registro do pedido: confere o preço no catálogo, aplica cashback e grava.
create or replace function public.place_order(
  _items jsonb,
  _use_cashback boolean default false,
  _name text default '',
  _phone text default '',
  _address text default ''
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
begin
  if v_uid is null then
    raise exception 'É preciso entrar na conta para enviar um pedido.';
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;

  for v_line in select * from jsonb_array_elements(_items) loop
    select p.name, p.price into v_pname, v_price
    from public.products p
    where p.id = (v_line->>'id')::uuid and p.active = true;

    if v_pname is null then
      raise exception 'Um dos produtos não está mais disponível.';
    end if;

    v_qty := coalesce(nullif((v_line->>'qty')::numeric, 0), 1);
    v_subtotal := v_subtotal + v_qty * v_price;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', v_line->>'id', 'name', v_pname, 'qty', v_qty, 'price', v_price));
  end loop;

  v_balance := coalesce(public.my_cashback(), 0);
  if _use_cashback then
    v_used := least(v_balance, v_subtotal);
  end if;
  v_total := v_subtotal - v_used;

  insert into public.orders (user_id, customer_name, phone, address, items, subtotal, cashback_used, total)
  values (v_uid, trim(_name), trim(_phone), trim(_address), v_lines, v_subtotal, v_used, v_total)
  returning id into v_order_id;

  if v_used > 0 then
    insert into public.cashback_entries (user_id, order_id, amount, kind, note)
    values (v_uid, v_order_id, -v_used, 'used', 'Cashback aplicado no pedido');
  end if;

  return jsonb_build_object(
    'id', v_order_id,
    'items', v_lines,
    'subtotal', v_subtotal,
    'cashback_used', v_used,
    'total', v_total,
    'customer_name', trim(_name),
    'phone', trim(_phone),
    'address', trim(_address)
  );
end;
$$;

-- Ao confirmar o pedido, creditamos 5% do total em cashback.
create or replace function public.credit_order_cashback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate numeric := 0.05;
  v_earned numeric;
begin
  if new.status = 'confirmado' and old.status is distinct from new.status then
    v_earned := round(new.total * v_rate, 2);
    if v_earned > 0 and not exists (
      select 1 from public.cashback_entries
      where order_id = new.id and kind = 'earned'
    ) then
      insert into public.cashback_entries (user_id, order_id, amount, kind, note)
      values (new.user_id, new.id, v_earned, 'earned', 'Cashback do pedido confirmado');
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_credit_cashback on public.orders;
create trigger orders_credit_cashback
  before update on public.orders
  for each row execute function public.credit_order_cashback();

-- Pedido de exclusão de conta (LGPD).
create or replace function public.request_account_deletion()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set deletion_requested_at = now()
  where id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.my_cashback() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, boolean, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- ---------- Catálogo de exemplo ----------
insert into public.products (name, category, description, flavor_profile, intensity, price) values
  ('Narguilé Mahina 60cm', 'Narguilé', 'Narguilé de alumínio anodizado com bandeja inox e haste desmontável.', 'neutro', 'média', 389.90),
  ('Narguilé Premium Acrílico', 'Narguilé', 'Corpo em acrílico colorido, base de vidro e vedação de silicone.', 'neutro', 'média', 259.00),
  ('Essência Dubaim Apple 50g', 'Essência', 'Maçã doce e suculenta, ideal para quem está começando.', 'frutado', 'leve', 44.90),
  ('Essência Dubaim Mint 50g', 'Essência', 'Hortelã pura com final gelado, perfeita para misturas.', 'menta', 'forte', 44.90),
  ('Essência Frutas Vermelhas 100g', 'Essência', 'Mix de morango, amora e framboesa com fundo cítrico.', 'frutado', 'média', 79.90),
  ('Essência Lemon Ice 50g', 'Essência', 'Limão siciliano gelado, refrescante e vibrante.', 'cítrico', 'média', 49.90),
  ('Essência Double Apple 100g', 'Essência', 'Clássico turco: maçã vermelha com toque de anis.', 'frutado', 'forte', 89.90),
  ('Carvão Natural Coco 33mm (10un)', 'Carvão', 'Pastilha de fibra de coco, queima longa e sem cheiro.', 'neutro', 'média', 29.90),
  ('Carvão Rápido Autoluzente (1kg)', 'Carvão', 'Acende sozinho em 2 minutos, ótimo para levar na bolsa.', 'neutro', 'média', 39.90),
  ('Kit Inicial Completo', 'Kit', 'Narguilé compacto, essência 50g, carvão, piteira e acessório de limpeza.', 'frutado', 'leve', 429.00),
  ('Piteira de Silicone Lavável', 'Acessório', 'Piteira ergonômica, refresca a fumaça e é fácil de limpar.', 'neutro', 'leve', 34.90),
  ('Mangueira de Couro com Ponta de Madeira', 'Acessório', 'Mangueira premium com vedação perfeita e cabo de madeira.', 'neutro', 'média', 89.90),
  ('Bowl de Substituição em Vidro', 'Acessório', 'Bowl universal com encaixe de silicone para copos de 18mm.', 'neutro', 'média', 59.90),
  ('Trava de Tela com Molas em Inox', 'Acessório', 'Não deixa a essência queimar e dura muito mais.', 'neutro', 'média', 24.90),
  ('Essência Uva Doce 50g', 'Essência', 'Uva brasileira com final cremoso.', 'frutado', 'leve', 44.90),
  ('Essência Tobacco Mild 50g', 'Essência', 'Tabaco leve com mel e especiarias suaves.', 'especiado', 'forte', 54.90),
  ('Carvão de Coco Natural (1kg)', 'Carvão', 'Brasa estável e duradoura, não altera o sabor da essência.', 'neutro', 'média', 49.90),
  ('Kit Viagem Essencial', 'Kit', 'Bolsa térmica, essências sortidas, carvão e piteira descartável.', 'cítrico', 'média', 219.00);
