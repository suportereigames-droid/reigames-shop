// Supabase Edge Function: cria o login (e-mail + senha) de um novo membro
// da equipe. Só quem já é admin pode chamar essa função — ela confere isso
// antes de fazer qualquer coisa, usando o token de quem está chamando.
//
// Deploy: Supabase → Edge Functions → New function → nome "create-team-member"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Não autenticado.' }, 401)

    // Cliente "como o usuário que chamou", só pra descobrir quem é e
    // conferir se é admin — nunca confiar em nada que vem do próprio app.
    const supabaseComoUsuario = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: userError } = await supabaseComoUsuario.auth.getUser(token)
    if (userError || !userData?.user) return json({ error: 'Não autenticado.' }, 401)

    const { data: perfilChamador } = await supabaseComoUsuario
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (perfilChamador?.role !== 'admin') {
      return json({ error: 'Só o admin pode criar contas da equipe.' }, 403)
    }

    const { fullName, email, password, role } = await req.json()
    if (!fullName || !email || !password) {
      return json({ error: 'Preencha nome, e-mail e senha.' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    // Agora sim, cliente com poder total (service role), só pra criar o
    // usuário — o gatilho do banco já cria o perfil de equipe sozinho.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const { data: novoUsuario, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })
    if (createError) {
      const msg = createError.message?.toLowerCase().includes('already been registered') || createError.status === 422
        ? `Esse e-mail já está cadastrado no sistema (provavelmente já foi usado por um comprador em "Minha conta", ou já é de outro membro). Use um e-mail diferente, que nunca tenha sido usado no site antes.`
        : createError.message
      return json({ error: msg }, 400)
    }

    if (role === 'admin') {
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', novoUsuario.user.id)
    }

    return json({ ok: true, userId: novoUsuario.user.id })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
