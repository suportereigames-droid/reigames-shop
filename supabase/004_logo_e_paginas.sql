-- =========================================================
-- REI GAMES — migração 004: logo do site + páginas personalizadas no menu
-- Rode DEPOIS das migrações anteriores, no SQL Editor do Supabase.
-- =========================================================

-- ---------- CONFIGURAÇÕES GERAIS DO SITE (uma linha só) ----------
create table if not exists public.site_settings (
  id boolean primary key default true check (id), -- trava pra existir só 1 linha
  logo_url text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute procedure public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: leitura pública"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings: só admin edita"
  on public.site_settings for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------- PÁGINAS PERSONALIZADAS (menu + código próprio) ----------
-- Ex: uma página "Grupo WhatsApp" com o HTML/botões que você quiser colar,
-- acessível em reigames.com.br/pagina/grupo-whatsapp e aparecendo no menu.
create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9])*$'),
  menu_label text not null,
  content_html text not null default '',
  show_in_menu boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_pages_set_updated_at on public.site_pages;
create trigger site_pages_set_updated_at
  before update on public.site_pages
  for each row execute procedure public.set_updated_at();

alter table public.site_pages enable row level security;

-- Público (site e app) só precisa ler.
create policy "site_pages: leitura pública"
  on public.site_pages for select
  to anon, authenticated
  using (true);

-- Só admin cria/edita/apaga páginas do site (é conteúdo da loja toda, não
-- de uma pessoa só — diferente das contas/produtos de cada vendedor).
create policy "site_pages: só admin cria"
  on public.site_pages for insert
  to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "site_pages: só admin edita"
  on public.site_pages for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "site_pages: só admin apaga"
  on public.site_pages for delete
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
