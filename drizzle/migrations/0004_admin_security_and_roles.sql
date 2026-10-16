-- ============================================================
-- Pantanal Smoke: Reforço de Segurança e Atribuição de Administrador
-- ============================================================

-- Garante que o papel 'admin' seja atribuído com segurança à proprietária
create or replace function public.handle_admin_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if lower(trim(new.email)) = 'gislaynefreitas23@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_admin_assignment on auth.users;
create trigger on_auth_user_admin_assignment
  after insert or update on auth.users
  for each row execute function public.handle_admin_role_assignment();

-- Função utilitária para conceder papel de admin por e-mail de forma segura
create or replace function public.assign_admin_role_by_email(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = lower(trim(target_email));
  if target_user_id is null then
    return false;
  end if;

  insert into public.user_roles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  return true;
end;
$$;

revoke all on function public.assign_admin_role_by_email(text) from public, anon;
grant execute on function public.assign_admin_role_by_email(text) to authenticated, service_role;
