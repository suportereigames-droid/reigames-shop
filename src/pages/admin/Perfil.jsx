import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Perfil() {
  const { user, isAdmin } = useAuth()
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    supabase.from('profiles').select('full_name, whatsapp, instagram_url').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setNome(data.full_name || '')
        setWhatsapp(data.whatsapp || '')
        setInstagramUrl(data.instagram_url || '')
      }
    })
  }, [user.id])

  async function salvar() {
    setSalvando(true)
    setSalvo(false)
    const payload = { full_name: nome, whatsapp }
    if (isAdmin) payload.instagram_url = instagramUrl
    const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
    setSalvando(false)
    if (!error) setSalvo(true)
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-ink">Meu perfil</h1>
      <p className="mt-1 text-sm text-mist">
        Esse é o WhatsApp que vai junto em todas as contas que você cadastrar — configura uma vez aqui, não
        precisa mais digitar em cada anúncio.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-mist">Nome</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-mist">Seu WhatsApp</label>
          <input className="input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(DDD) 9 9999-9999" />
        </div>

        {salvo && <p className="text-sm text-emerald">Perfil atualizado!</p>}
        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>

        <div>
          <button
            onClick={async () => {
              const { data: sessao } = await supabase.auth.getSession()
              const resposta = await fetch(`${supabase.supabaseUrl}/functions/v1/test-push`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${sessao.session.access_token}`,
                  apikey: supabase.supabaseKey
                }
              })
              const corpo = await resposta.json().catch(() => null)
              alert(
                resposta.ok
                  ? `Notificação enviada pra ${corpo.enviadosPara} aparelho(s)! Se não chegar em alguns segundos no celular, o problema é na entrega (Firebase/Expo).`
                  : `Não foi possível: ${corpo?.error || `Erro ${resposta.status}`}`
              )
            }}
            className="btn-ghost"
          >
            📨 Mandar notificação de teste (pro celular logado com essa conta)
          </button>
          <p className="mt-1 text-xs text-mist">
            Só funciona se esse usuário já tiver um token salvo (registrado pelo app antes). Isso testa se o
            servidor consegue entregar a notificação, sem precisar mexer no app.
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-sm text-mist">
            Só você (admin) vê isso — o Instagram daqui aparece no rodapé e no botão flutuante do site inteiro.
          </p>
          <label className="mb-1 mt-3 block text-sm text-mist">Link do Instagram da loja</label>
          <input
            className="input"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/reigames"
          />
          <button onClick={salvar} disabled={salvando} className="btn-primary mt-3">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      )}
    </div>
  )
}
