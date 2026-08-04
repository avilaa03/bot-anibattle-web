import Link from 'next/link';
import { TIERS, ORDEM_TIERS, NUNCA_INCLUSO, LIMITE_DESEJOS_GRATIS, reducaoCooldown } from '@/lib/vip';

export const metadata = {
  title: 'Planos VIP',
  description:
    'Apoie o AniBattle e leve molduras animadas, cooldown menor e recompensa diária maior. '
    + 'Nenhum plano dá vantagem de combate.'
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
const LINHAS: { rotulo: string; valor: (t: typeof TIERS[string]) => string; gratis: string }[] = [
  {
    rotulo: 'Cooldown do /roll',
    gratis: 'normal',
    valor: (t) => `−${reducaoCooldown(t)}%`
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
              p: 'A redução de cooldown não é vantagem?',
              r: 'É conveniência, e é a única que encosta na economia — rolar mais gera mais moeda. '
                 + 'Por isso ela é modesta e limitada: no plano mais caro são 40%, e nada disso muda '
                 + 'o resultado de uma batalha nem a chance de rolar carta rara.'
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
