-- ============================================================
-- Pantanal Smoke: Reforço de Segurança do Storage (Bucket products)
-- ============================================================

-- 1. Garante que o bucket 'products' seja explicitamente configurado como bucket público de fotos,
-- limitando o tamanho a 5MB e aceitando estritamente formatos de imagem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880, -- 5 MB máximo por imagem
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- 2. Revoga as políticas amplas anteriores que geraram o alerta no Lovable Cloud
drop policy if exists "products bucket: fotos visíveis na vitrine" on storage.objects;
drop policy if exists "products bucket: admin envia fotos" on storage.objects;
drop policy if exists "products bucket: admin troca fotos" on storage.objects;
drop policy if exists "products bucket: admin apaga fotos" on storage.objects;
drop policy if exists "products: imagens publicas do catalogo visiveis a todos" on storage.objects;
drop policy if exists "products: apenas admin pode enviar fotos de produtos" on storage.objects;
drop policy if exists "products: apenas admin pode atualizar fotos de produtos" on storage.objects;
drop policy if exists "products: apenas admin pode excluir fotos de produtos" on storage.objects;

-- 3. Nova política de LEITURA: permite apenas visualização de IMAGENS legítimas do catálogo
-- Bloqueia expressamente qualquer leitura de documentos, arquivos de texto, backups ou dados pessoais.
create policy "products: imagens publicas do catalogo visiveis a todos"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'products'
    and (
      lower(name) like '%.png'
      or lower(name) like '%.jpg'
      or lower(name) like '%.jpeg'
      or lower(name) like '%.webp'
      or lower(name) like '%.gif'
      or lower(name) like '%.svg'
      or lower(name) like '%.avif'
    )
  );

-- 4. Nova política de UPLOAD: apenas administradores com papel 'admin' no banco podem enviar arquivos,
-- e apenas imagens nos formatos permitidos
create policy "products: apenas admin pode enviar fotos de produtos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'products'
    and public.has_role(auth.uid(), 'admin')
    and (
      lower(name) like '%.png'
      or lower(name) like '%.jpg'
      or lower(name) like '%.jpeg'
      or lower(name) like '%.webp'
      or lower(name) like '%.gif'
      or lower(name) like '%.svg'
      or lower(name) like '%.avif'
    )
  );

-- 5. Nova política de ATUALIZAÇÃO: apenas administradores com papel 'admin'
create policy "products: apenas admin pode atualizar fotos de produtos"
  on storage.objects for update to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));

-- 6. Nova política de EXCLUSÃO: apenas administradores com papel 'admin'
create policy "products: apenas admin pode excluir fotos de produtos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'products' and public.has_role(auth.uid(), 'admin'));
