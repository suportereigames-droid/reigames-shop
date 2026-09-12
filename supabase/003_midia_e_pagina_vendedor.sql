-- =========================================================
-- REI GAMES — migração 003: vídeos nas contas + página própria por vendedor
-- Rode DEPOIS de schema.sql e 002_push_e_visitas.sql, no SQL Editor do Supabase.
-- =========================================================

-- ---------- MÍDIA (imagens E vídeos) ----------
-- Troca a coluna "images" (só URLs de imagem) por "media": um array de
-- objetos { type: 'image' | 'video', path: 'caminho-no-storage', url: '...' }.
-- Guardar o "path" é o que permite apagar o arquivo do Storage quando o
-- produto é excluído, em vez de deixá-lo esquecido ocupando espaço.
alter table public.products rename column images to media;
alter table public.products alter column media set default '[]';

-- ---------- PÁGINA PRÓPRIA DE CADA VENDEDOR ----------
create table if not exists public.seller_pages (
  seller_id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9])*$'),
  display_name text not null,
  whatsapp text,
  banner_text text,
  banner_video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists seller_pages_set_updated_at on public.seller_pages;
create trigger seller_pages_set_updated_at
  before update on public.seller_pages
  for each row execute procedure public.set_updated_at();

alter table public.seller_pages enable row level security;

-- Página pública: qualquer visitante pode ler (é a "vitrine pessoal").
create policy "seller_pages: leitura pública"
  on public.seller_pages for select
  to anon, authenticated
  using (true);

-- Só o próprio vendedor (ou admin) cria/edita a própria página.
create policy "seller_pages: dono ou admin cria"
  on public.seller_pages for insert
  to authenticated
  with check (
    seller_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "seller_pages: dono ou admin edita"
  on public.seller_pages for update
  to authenticated
  using (
    seller_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    seller_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
