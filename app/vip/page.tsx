import Link from 'next/link';
import { TIERS, ORDEM_TIERS, NUNCA_INCLUSO, LIMITE_DESEJOS_GRATIS, reducaoCooldown } from '@/lib/vip';
import { CARGAS_BASE, NIVEIS_DE_CARGA, maxCargas } from '@/lib/nivel';

export const metadata = {
  title: 'Planos VIP',
  description:
    'Apoie o AniBattle e leve molduras animadas, cooldown menor, uma carga de roll a mais e '
    + 'recompensa diária maior. Nenhum plano dá vantagem de combate nem chance de carta rara.'
};

// A página é estática: preço e vantagens vêm do código, não do banco.
export const revalidate = 3600;

const SUPORTE = process.env.NEXT_PUBLIC_SUPPORT_URL || '#';

/**
 * Linhas do comparativo.
 *
 * Ficam numa estrutura só para a tabela não sair do ar com a realidade:
 * cada linha lê direto do TIERS, que espelha `vip.js` do bot.
 */
/** O teto de cargas de quem joga de graça no nível mais alto de carga. */
const CARGAS_MAX_GRATIS = maxCargas(NIVEIS_DE_CARGA[NIVEIS_DE_CARGA.length - 1]);

const LINHAS: { rotulo: string; valor: (t: typeof TIERS[string]) => string; gratis: string }[] = [
  {
    rotulo: 'Cooldown do /roll',
    gratis: 'normal',
    valor: (t) => `−${reducaoCooldown(t)}%`
  },
  {
    // A vantagem nova, e a única que mexe em QUANTIDADE. Ela soma com as
    // cargas do nível em vez de substituir — quem quiser conferir a conta
    // precisa ver os dois números lado a lado.
    rotulo: 'Cargas de roll acumuladas',
    gratis: `${CARGAS_BASE} (até ${CARGAS_MAX_GRATIS} por nível)`,
    valor: (t) =>
      t.cargasExtras > 0
        ? `+${t.cargasExtras} (até ${CARGAS_MAX_GRATIS + t.cargasExtras})`
        : `${CARGAS_BASE} (até ${CARGAS_MAX_GRATIS} por nível)`
  },
  {
    rotulo: 'Recompensa diária',
    gratis: '1×',
    valor: (t) => `${t.dailyMultiplier}×`
  },
  {
    rotulo: 'Molduras de carta',
    gratis: 'padrão',
    valor: (t) => `${t.molduras.length} (${t.molduras.join(', ')})`
  },
  {
    rotulo: 'Lista de desejos',
    gratis: `${LIMITE_DESEJOS_GRATIS} cartas`,
    valor: (t) => `${t.limiteDesejos} cartas`
  },
  {
    rotulo: 'Cor do perfil',
    gratis: '—',
    valor: (t) => (t.podeCorPerfil ? '✓' : '—')
  },
  {
    rotulo: 'Banner no perfil',
    gratis: '—',
    valor: (t) => (t.podeBanner ? '✓' : '—')
  },
  {
    rotulo: 'Destaque no ranking',
    gratis: '—',
    valor: (t) => (t.destaqueRanking ? '✓' : '—')
  }
];

export default function PaginaVip() {
  return (
    <div className="container-site py-16">
      {/* ---------- Topo ---------- */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Apoie o AniBattle</h1>
        <p className="mt-4 text-lg leading-relaxed text-textoFraco">
          O jogo é de graça e continua sendo. Quem assina leva aparência e conveniência —
          e ajuda a pagar o servidor.
        </p>
      </div>

      {/* ---------- A promessa que importa ---------- */}
      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-marca/40 bg-marca/5 p-6">
        <h2 className="text-lg font-semibold">🛡️ Nenhum plano dá vantagem de combate</h2>
        <p className="mt-3 text-sm leading-relaxed text-textoFraco">
          Isso não é promessa de marketing, é regra de código: existe um teste automatizado
          que <strong className="text-texto">falha e impede a publicação</strong> se alguém tentar
          dar atributo, chance de raridade ou vantagem de batalha a um plano pago.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-textoFraco sm:grid-cols-2">
          {NUNCA_INCLUSO.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-red-400">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-textoFraco">
          Um bot de cartas que vende poder esvazia a base gratuita — que é justamente quem
          faz o jogo crescer. E como as batalhas do AniBattle valem moeda, poder comprado
          seria pior ainda.
        </p>
      </section>

      {/*
        ---------- Cargas de roll ----------

        A vantagem mais recente e a única que mexe em quantidade, então é
        também a mais fácil de ler como pay-to-win. Explicar a mecânica
        inteira aqui — inclusive que o jogador grátis chega ao teto dele
        sozinho, só subindo de nível — custa espaço e evita a acusação.
      */}
      <section className="mx-auto mt-10 max-w-3xl rounded-xl border border-borda bg-superficie p-6">
        <h2 className="text-lg font-semibold">🎴 Cargas de roll: o que mudou</h2>
        <p className="mt-3 text-sm leading-relaxed text-textoFraco">
          Antes, um <code className="rounded bg-superficie2 px-1 py-0.5">/roll</code> não usado
          simplesmente evaporava: se você ficasse o dia fora, perdia o dia todo. Agora os rolls{' '}
          <strong className="text-texto">acumulam</strong> — o cooldown continua correndo enquanto
          você não está, e as cargas ficam esperando.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-borda bg-fundo p-4">
            <h3 className="text-sm font-semibold">Jogando de graça</h3>
            <p className="mt-2 text-sm leading-relaxed text-textoFraco">
              Você começa com <strong className="text-texto">{CARGAS_BASE}</strong> e ganha mais uma
              nos níveis <strong className="text-texto">{NIVEIS_DE_CARGA.join(', ')}</strong>,
              chegando a <strong className="text-texto">{CARGAS_MAX_GRATIS}</strong> sem pagar nada.
              O nível sobe com o que você já faz: rolar, batalhar, trocar, descobrir carta nova.
            </p>
          </div>
          <div className="rounded-lg border border-borda bg-fundo p-4">
            <h3 className="text-sm font-semibold">Assinando Ouro ou Master</h3>
            <p className="mt-2 text-sm leading-relaxed text-textoFraco">
              A assinatura dá <strong className="text-texto">+1 carga</strong> que{' '}
              <strong className="text-texto">soma</strong> com as do nível, chegando a{' '}
              {CARGAS_MAX_GRATIS + 1}. É uma carga a mais, não um atalho de nível — o teto do
              assinante no nível 1 é {CARGAS_BASE + 1}, não {CARGAS_MAX_GRATIS + 1}.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-textoFraco">
          <strong className="text-texto">Isso é vantagem de quantidade, não de sorte.</strong> Uma
          carga a mais significa um roll a mais guardado para quando você voltar. A chance de sair
          Lendária ou Mestra é <strong className="text-texto">exatamente a mesma</strong> para todo
          mundo — a tabela de raridade não consulta assinatura, e há teste automatizado que garante
          isso.
        </p>
      </section>

      {/* ---------- Planos ---------- */}
      <section className="mt-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ORDEM_TIERS.map((chave) => {
            const t = TIERS[chave];
            const destaque = chave === 'ouro';

            return (
              <div
                key={chave}
                className={`cartao relative flex flex-col p-6 ${destaque ? 'ring-2 ring-marca' : ''}`}
                style={{ borderColor: `${t.cor}44` }}
              >
                {destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marca px-3 py-0.5 text-xs font-medium text-white">
                    mais escolhido
                  </span>
                )}

                <div className="text-3xl">{t.emoji}</div>
                <h3 className="mt-3 text-lg font-bold" style={{ color: t.cor }}>{t.nome}</h3>

                <div className="mt-3">
                  <span className="text-3xl font-bold">R$ {t.precoBRL}</span>
                  <span className="text-sm text-textoFraco"> /mês</span>
                </div>

                <ul className="mt-5 flex-1 space-y-2 text-sm text-textoFraco">
                  <li>⏱️ <strong className="text-texto">−{reducaoCooldown(t)}%</strong> no cooldown do /roll</li>
                  {t.cargasExtras > 0 && (
                    <li>
                      🎴 <strong className="text-texto">+{t.cargasExtras}</strong> carga de roll acumulada
                    </li>
                  )}
                  <li>🎁 Daily <strong className="text-texto">{t.dailyMultiplier}×</strong> maior</li>
                  <li>🖼️ <strong className="text-texto">{t.molduras.length}</strong> moldura(s) de carta</li>
                  <li>💭 <strong className="text-texto">{t.limiteDesejos}</strong> cartas na lista de desejos</li>
                  {t.podeBanner && <li>🏳️ Banner no perfil</li>}
                  {t.destaqueRanking && <li>✨ Destaque no ranking</li>}
                </ul>

                <a href={SUPORTE} target="_blank" rel="noopener noreferrer"
                   className={`mt-6 ${destaque ? 'botao-primario' : 'botao-secundario'} w-full justify-center`}>
                  Assinar
                </a>
              </div>
            );
          })}
        </div>

        {/*
          Enquanto o checkout automático não existe, a compra é combinada
          no servidor de suporte e ativada com `npm run vip:grant` ou pelo
          painel. Dizer isso abertamente é melhor que um botão que leva a
          um checkout quebrado.
        */}
        <p className="mt-6 text-center text-sm text-textoFraco">
          O pagamento por PIX ainda é combinado no servidor de suporte — o checkout automático
          está a caminho. A ativação é feita na hora, manualmente.
        </p>
      </section>

      {/* ---------- Comparativo ---------- */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">Comparativo</h2>

        <div className="cartao mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-superficie2 text-left text-xs text-textoFraco">
              <tr>
                <th className="px-4 py-3">Vantagem</th>
                <th className="px-4 py-3">Grátis</th>
                {ORDEM_TIERS.map((c) => (
                  <th key={c} className="px-4 py-3" style={{ color: TIERS[c].cor }}>
                    {TIERS[c].emoji} {TIERS[c].nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {LINHAS.map((linha) => (
                <tr key={linha.rotulo}>
                  <td className="px-4 py-3">{linha.rotulo}</td>
                  <td className="px-4 py-3 text-textoFraco">{linha.gratis}</td>
                  {ORDEM_TIERS.map((c) => (
                    <td key={c} className="px-4 py-3">{linha.valor(TIERS[c])}</td>
                  ))}
                </tr>
              ))}
              <tr className="bg-superficie2/40">
                <td className="px-4 py-3 font-medium">Vantagem em batalha</td>
                <td className="px-4 py-3 text-textoFraco">—</td>
                {ORDEM_TIERS.map((c) => (
                  <td key={c} className="px-4 py-3 text-textoFraco">—</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Perguntas ---------- */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold">Perguntas</h2>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[
            {
              p: 'Cooldown menor e carga a mais não são vantagem?',
              r: 'São, e são as duas únicas que encostam na economia — rolar mais gera mais moeda. '
                 + 'Por isso as duas são de quantidade, nunca de sorte, e são limitadas: no plano '
                 + 'mais caro são 40% de cooldown e uma carga a mais. Nenhuma das duas muda o '
                 + 'resultado de uma batalha nem a chance de sair carta rara.'
            },
            {
              p: 'Preciso assinar para acumular rolls?',
              r: 'Não. Acumular é de todo mundo, e o teto sobe com o seu nível — nos níveis '
                 + `${NIVEIS_DE_CARGA.join(', ')} você ganha uma carga cada vez, chegando a `
                 + `${CARGAS_MAX_GRATIS} sem pagar nada. A assinatura Ouro e Master soma +1 em cima disso.`
            },
            {
              p: 'As caixas dão carta melhor para quem assina?',
              r: 'Não. As porcentagens de cada caixa são fixas, ficam à vista no /caixa e são iguais '
                 + 'para todo mundo. Assinatura não muda chance de caixa, e também não dá desconto '
                 + 'nem caixa de graça — a Caixa do Apoiador sai de votar no bot, que é gratuito.'
            },
            {
              p: 'Assinante tem carta de evento exclusiva?',
              r: 'Não do jeito que costuma acontecer. Cartas de evento saem de eventos, e entrar num '
                 + 'evento é de graça — use /evento no Discord. O que a assinatura nunca dá é carta '
                 + 'que só existe para quem paga.'
            },
            {
              p: 'O que acontece quando a assinatura vence?',
              r: 'Você continua com todas as cartas e moedas. Só as vantagens param de valer, e a '
                 + 'moldura equipada volta para a padrão. Se assinar de novo, ela volta como estava.'
            },
            {
              p: 'Renovar antes de vencer perde os dias que sobraram?',
              r: 'Não. O tempo restante é somado ao novo período.'
            },
            {
              p: 'Dá para trocar de plano?',
              r: 'Dá. Fale no servidor de suporte que a gente ajusta.'
            },
            {
              p: 'As molduras são animadas?',
              r: 'As de Ouro e Master sim — a carta vira um GIF com o efeito da moldura. '
                 + 'É puramente visual e não muda atributo nenhum.'
            },
            {
              p: 'Para onde vai o dinheiro?',
              r: 'Servidor, banco de dados e o tempo de desenvolvimento. O AniBattle é um projeto '
                 + 'de uma pessoa só.'
            }
          ].map(({ p, r }) => (
            <div key={p} className="cartao p-5">
              <h3 className="font-medium">{p}</h3>
              <p className="mt-2 text-sm leading-relaxed text-textoFraco">{r}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-14 text-center">
        <Link href="/cartas" className="botao-secundario">Ver o catálogo de cartas</Link>
      </div>
    </div>
  );
}
