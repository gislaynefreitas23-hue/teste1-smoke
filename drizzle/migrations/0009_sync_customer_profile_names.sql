-- ============================================================
-- Pantanal Smoke: Sincronização e Recuperação de Nomes de Clientes
-- ============================================================

-- 1. Sincronização retroativa: Preenche nomes em profiles a partir dos pedidos realizados
update public.profiles p
set name = sub.customer_name,
    updated_at = now()
from (
  select distinct on (user_id) user_id, trim(customer_name) as customer_name
  from public.orders
  where user_id is not null 
    and customer_name is not null 
    and trim(customer_name) <> '' 
    and trim(customer_name) <> 'Cliente Pantanal'
  order by user_id, created_at desc
) sub
where p.id = sub.user_id
  and (p.name is null or trim(p.name) = '' or trim(p.name) = 'Cliente Pantanal');

-- 2. Atualização da função RPC place_order para atualizar o perfil do cliente se ainda estiver vazio
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
  v_clean_name text;
begin
  v_clean_name := trim(coalesce(_name, ''));
  v_target_city := lower(trim(coalesce(_city_id, 'cuiaba')));
  if v_target_city not in ('cuiaba', 'sao-paulo') then
    v_target_city := 'cuiaba';
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'O carrinho está vazio.';
  end if;

  for v_line in select * from jsonb_array_elements(_items) loop
    v_qty := coalesce(nullif((v_line->>'qty')::numeric, 0), 1);

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

  if v_uid is not null then
    v_balance := coalesce(public.my_cashback(), 0);
    if _use_cashback then
      v_used := least(v_balance, v_subtotal);
    end if;

    -- Sincroniza o nome no perfil do cliente se houver nome fornecido e o perfil estiver sem nome
    if v_clean_name <> '' and v_clean_name <> 'Cliente Pantanal' then
      update public.profiles
      set name = v_clean_name,
          updated_at = now()
      where id = v_uid
        and (name is null or trim(name) = '' or trim(name) = 'Cliente Pantanal');
    end if;
  else
    v_used := 0;
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
    total,
    status
  )
  values (
    v_uid,
    v_clean_name,
    trim(_phone),
    trim(_address),
    v_target_city,
    v_lines,
    v_subtotal,
    v_used,
    v_total,
    'pendente'
  )
  returning id into v_order_id;

  if v_uid is not null and v_used > 0 then
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

grant execute on function public.place_order(jsonb, boolean, text, text, text, text) to anon, authenticated;
