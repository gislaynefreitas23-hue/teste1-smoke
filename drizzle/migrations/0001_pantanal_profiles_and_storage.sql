-- Cria o perfil automaticamente quando alguém entra pela primeira vez.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fotos dos produtos: o espaço não é listado nem aberto por URL direta,
-- mas qualquer pessoa que entra na loja pode carregar a imagem do card.
create policy "products bucket: fotos visíveis na vitrine"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'products');

-- Só a loja (admin) envia, troca e apaga fotos.
create policy "products bucket: admin envia fotos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));

create policy "products bucket: admin troca fotos"
  on storage.objects for update to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));

create policy "products bucket: admin apaga fotos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));
