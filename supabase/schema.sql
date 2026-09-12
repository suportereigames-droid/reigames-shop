-- =========================================================
-- REI GAMES — Schema Supabase (Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =========================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "pgcrypto";

-- ---------- PERFIS DA EQUIPE ----------
-- Cada linha de auth.users ganha um perfil com um papel (role).
-- 'admin'  -> vê e edita todos os produtos/contas
-- 'membro' -> vê e edita apenas o que ele mesmo criou
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'membro' check (role in ('admin', 'membro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Todo usuário autenticado pode ver a lista de perfis (útil para mostrar
-- "postado por Fulano" no painel). Ninguém edita o próprio papel — só admin.
create policy "profiles: leitura para autenticados"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: admin atualiza qualquer perfil"
  on public.profiles for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "profiles: usuário atualiza o próprio nome"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Cria automaticamente um perfil ('membro') quando um novo usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'membro');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- PRODUTOS / CONTAS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  -- referencia profiles (não auth.users) para permitir o join
  -- products -> profiles(full_name) usado no painel admin
  created_by uuid not null references public.profiles (id) default auth.uid(),
  game text not null,                 -- ex: 'EFOOTBALL', 'Clash of Clans'
  title text not null,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  images jsonb not null default '[]', -- array de URLs
  status text not null default 'disponivel'
    check (status in ('disponivel', 'reservado', 'vendido', 'oculto')),
  whatsapp text,                      -- contato para negociação/entrega
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_by_idx on public.products (created_by);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_game_idx on public.products (game);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;

-- Vitrine pública: qualquer visitante (anon) vê apenas produtos disponíveis.
create policy "produtos: loja pública vê disponíveis"
  on public.products for select
  to anon
  using (status = 'disponivel');

-- Painel: cada membro da equipe só enxerga o que ele mesmo postou.
-- Admin enxerga tudo (inclusive ocultos/vendidos, para relatórios).
create policy "produtos: membro vê os próprios, admin vê tudo"
  on public.products for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Criar: qualquer usuário autenticado pode criar, mas o dono tem que ser ele mesmo.
create policy "produtos: criar sempre como dono"
  on public.products for insert
  to authenticated
  with check (created_by = auth.uid());

-- Editar: só o dono (ou admin) pode editar, e não pode "roubar" um produto
-- trocando o created_by para outra pessoa.
create policy "produtos: editar próprio ou admin"
  on public.products for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Excluir: só o dono (ou admin).
create policy "produtos: excluir próprio ou admin"
  on public.products for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------- PEDIDOS (Mercado Pago) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  seller_id uuid not null references auth.users (id), -- copiado de products.created_by na criação
  buyer_name text not null,
  buyer_whatsapp text not null,
  amount numeric(10,2) not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'cancelado', 'estornado')),
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

alter table public.orders enable row level security;

-- Só o vendedor dono do produto (ou admin) vê os pedidos daquele produto.
-- A criação e atualização de pedidos é feita pelas Edge Functions com a
-- service_role key (que ignora RLS), nunca direto pelo cliente.
create policy "pedidos: vendedor vê os próprios, admin vê tudo"
  on public.orders for select
  to authenticated
  using (
    seller_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------- STORAGE (fotos das contas) ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "imagens: leitura pública"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

create policy "imagens: autenticados podem enviar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

create policy "imagens: dono pode apagar a própria pasta"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and owner = auth.uid());
