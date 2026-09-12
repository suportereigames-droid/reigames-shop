# Rei Games — plataforma de vendas

E-commerce em React + Tailwind para venda de contas de jogos (EFOOTBALL, Clash of Clans, Clash Royale, Brawl Stars, Hay Day, Wartune Ultra), com banco de dados e autenticação no Supabase e pagamentos pelo Mercado Pago.

## Estrutura

```
src/
  pages/            loja pública (vitrine, produto, checkout)
  pages/admin/      painel administrativo (login, dashboard, CRUD)
  context/          autenticação (sessão + papel do usuário)
  components/       layout e componentes reutilizáveis
supabase/
  schema.sql                        tabelas + Row Level Security
  functions/create-preference/      cria a cobrança no Mercado Pago
  functions/mercadopago-webhook/    recebe a confirmação de pagamento
```

## Como funciona a permissão "cada um só vê o que postou"

A regra não fica no código do React — ela fica no banco, via **Row Level
Security (RLS)** do Postgres, em `supabase/schema.sql`:

- Tabela `profiles`: cada usuário da equipe tem um papel, `admin` ou `membro`.
- Tabela `products`: toda linha guarda `created_by` (quem postou).
- Políticas de RLS em `products`:
  - `membro` só recebe (SELECT/UPDATE/DELETE) linhas onde `created_by = auth.uid()`;
  - `admin` recebe todas as linhas;
  - ao criar (INSERT), o banco exige `created_by = auth.uid()` — ninguém consegue
    postar um produto "em nome" de outra pessoa, mesmo manipulando a requisição.

Como isso roda dentro do Postgres, mesmo que alguém tente burlar o front-end
(inspecionar rede, chamar a API do Supabase direto), a API só devolve o que a
policy permite para aquele usuário logado.

## Passo a passo de configuração

### 1. Criar o projeto no Supabase
1. Crie um projeto em supabase.com.
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e execute.
3. Rode também, na ordem: `supabase/002_push_e_visitas.sql` (se for usar o
   app TT) e `supabase/003_midia_e_pagina_vendedor.sql` (vídeos nos anúncios
   + página própria de cada vendedor).
4. Em **Authentication → Providers**, deixe e-mail/senha habilitado.
5. Crie os primeiros usuários da equipe em **Authentication → Users → Add user**
   (isso já dispara o trigger que cria o `profile` como `membro`).
6. Para tornar alguém `admin`, rode no SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = 'UUID-DO-USUARIO';
   ```

### 2. Configurar o front-end
```bash
cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (em Project Settings → API)
npm install
npm run dev
```

### 3. Configurar o Mercado Pago
1. Pegue seu **Access Token** em mercadopago.com.br/developers (produção ou teste).
2. Instale a Supabase CLI e faça login (`supabase login`).
3. Defina os segredos das Edge Functions:
   ```bash
   supabase secrets set MERCADOPAGO_ACCESS_TOKEN=SEU_ACCESS_TOKEN
   supabase secrets set SITE_URL=https://seu-dominio.com.br
   ```
4. Publique as funções:
   ```bash
   supabase functions deploy create-preference
   supabase functions deploy mercadopago-webhook
   ```
5. No painel do Mercado Pago, nada mais é necessário: a própria função
   `create-preference` já envia a `notification_url` do webhook a cada compra.

### 4. Publicar o site
`npm run build` gera a pasta `dist/`, que pode ser publicada em qualquer
hospedagem estática (Vercel, Netlify, Cloudflare Pages) ou no domínio próprio
já usado pela loja.

## Fluxo de uma venda
1. Cliente escolhe uma conta na vitrine (`/`) e clica em **Comprar agora**.
2. Preenche nome e WhatsApp em `/checkout/:id`.
3. O front chama a Edge Function `create-preference`, que cria o pedido
   (`orders`, status `pendente`) e a preferência no Mercado Pago, redirecionando
   o cliente para o checkout deles.
4. Após o pagamento, o Mercado Pago chama o webhook, que confirma o pagamento
   direto na API deles (não confia no retorno da URL) e marca o pedido como
   `pago` e o produto como `vendido`.
5. O vendedor (dono daquele produto) vê o pedido pago no seu painel e faz a
   entrega pelo WhatsApp informado.

## Papéis da equipe
- **membro**: cria contas para vender, edita/exclui apenas as próprias, vê
  apenas os próprios pedidos.
- **admin**: enxerga e edita tudo, incluindo quem postou cada conta.

## Fotos, vídeos e exclusão

Cada conta pode ter várias fotos e vídeos juntos (campo `media` na tabela
`products`). Ao excluir uma conta pelo painel, o próprio código já apaga os
arquivos correspondentes no Storage antes de apagar a linha — nada fica
"esquecido" ocupando espaço.

## Loja pessoal de cada vendedor

Em **Minha loja** (painel), cada pessoa define seu link
(`reigames.com.br/nome-que-ela-escolher`), WhatsApp próprio e, se quiser, um
texto e um vídeo de destaque. Essa página pública mostra só as contas
daquela pessoa. O admin pode configurar a loja de qualquer um pela mesma
tela (tem um seletor de "editando a loja de").

## Este site vira o app (APK) sozinho?

Não. `reigames-shop` (este projeto, um site React) e `tt-reigames` (o app
de celular, em React Native) são **dois projetos separados**, mesmo
compartilhando o mesmo banco no Supabase. Atualizar este site:
- muda o que aparece pra quem visita **pelo navegador**, assim que você
  publicar de novo (não tem "instalação", é só subir os arquivos novos);
- **não** muda nada no aplicativo já instalado no celular da equipe — o app
  é compilado à parte, e só muda quando você gera um novo `.apk` a partir do
  código do `tt-reigames` (veja o README daquele projeto).
