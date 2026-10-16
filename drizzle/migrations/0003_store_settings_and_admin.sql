-- ============================================================
-- Pantanal Smoke: Tabela de Configurações Dinâmicas da Loja
-- ============================================================

create table if not exists public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select on public.store_settings to anon, authenticated;
grant all on public.store_settings to service_role, authenticated;

alter table public.store_settings enable row level security;

create policy "store_settings: todos podem ler configuracoes publicas"
  on public.store_settings for select to anon, authenticated
  using (true);

create policy "store_settings: administradores podem editar configuracoes"
  on public.store_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
