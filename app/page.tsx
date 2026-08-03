import Link from 'next/link';
import CartaVisual from '@/components/CartaVisual';
import { cartasDestaque, estatisticas, REVALIDATE } from '@/lib/consultas';
import { ETIQUETAS, formatarData } from '@/lib/noticias';
import { listarNoticias } from '@/lib/noticiasDb';
import { RARIDADES, ORDEM_RARIDADES } from '@/lib/raridades';

// Revalida a cada 5 min: os números mudam devagar e assim a home é
// servida do cache, sem bater no Mongo a cada visita.
export const revalidate = REVALIDATE;

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

const RECURSOS = [
  {
    emoji: '🎴',
    titulo: 'Colecione',
    texto: 'Role cartas de personagens de anime. Cinco raridades, do comum ao mestre — e a raridade acompanha a popularidade real do personagem.'
  },
  {
    emoji: '⚔️',
    titulo: 'Batalhe',
    texto: 'Duelos 3 contra 3 com aposta. Tem dano variável, crítico e esquiva, e quem cai abaixo de 40% de vida entra em modo desespero. Viradas acontecem.'
  },
  {
    emoji: '📖',
    titulo: 'Complete a Pokédex',
    texto: 'Toda carta que passa pelo seu inventário fica registrada para sempre — mesmo que você venda depois.'
  },
  {
    emoji: '🤝',
    titulo: 'Negocie',
    texto: 'Mercado entre jogadores e troca direta carta por carta, com confirmação dos dois lados.'
  },
  {
    emoji: '🏆',
    titulo: 'Conquiste troféus',
    texto: '28 troféus em bronze, prata e ouro. A platina só desbloqueia quando você tiver todos os outros.'
  },
  {
    emoji: '🥇',
    titulo: 'Suba no ranking',
    texto: 'Pontuação de batalha de Bronze a Mestre. Ganhar de quem é mais forte vale muito mais.'
  }
];

export default async function PaginaInicial() {
  const [stats, destaques, noticias] = await Promise.all([
    estatisticas(),
    cartasDestaque(5),
    // As notícias vêm do banco (editadas em /admin/noticias). Rascunhos
    // não entram: `listarNoticias` filtra por `publicada` por padrão.
    listarNoticias({ limite: 4 })
  ]);

  const numeros = [
    { valor: stats.totalCartas, rotulo: 'cartas no catálogo' },
    { valor: stats.totalSeries, rotulo: 'animes diferentes' },
    { valor: stats.totalJogadores, rotulo: 'jogadores' },
    { valor: stats.totalDescobertas, rotulo: 'cartas descobertas' }
  ];

  const noticiaDestaque = noticias.find((n) => n.destaque) ?? noticias[0];
  const outrasNoticias = noticias.filter((n) => n.id !== noticiaDestaque?.id).slice(0, 3);

  return (
    <>
      {/* ---------- Topo ---------- */}
      <section className="relative overflow-hidden border-b border-borda">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(233,30,99,0.35), transparent 70%)'
          }}
        />
        <div className="container-site relative py-20 text-center sm:py-28">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-marca">
            Bot de Discord
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            Colecione cartas de anime.
            <br />
            <span className="text-marca">Dispute com seus amigos.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-textoFraco">
            Role cartas dos seus personagens favoritos, complete sua Pokédex,
            negocie no mercado e prove quem monta o melhor time. Tudo dentro do
            Discord, de graça.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={INVITE} target="_blank" rel="noopener noreferrer" className="botao-primario">
              Adicionar ao meu servidor
            </a>
            <Link href="/cartas" className="botao-secundario">
              Ver o catálogo
            </Link>
          </div>

          {/* Números reais, direto do banco do bot */}
          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {numeros.map((n) => (
              <div key={n.rotulo}>
                <dt className="text-3xl font-bold sm:text-4xl">
                  {new Intl.NumberFormat('pt-BR').format(n.valor)}
                </dt>
                <dd className="mt-1 text-xs text-textoFraco sm:text-sm">{n.rotulo}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- Cartas em destaque ---------- */}
      {destaques.length > 0 && (
        <section className="container-site py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Cartas raras</h2>
              <p className="mt-2 text-textoFraco">
                Algumas das melhores cartas que existem no jogo.
              </p>
            </div>
            <Link href="/cartas" className="shrink-0 text-sm text-marca hover:underline">
              Ver todas →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {destaques.map((carta, i) => (
              <CartaVisual
                key={carta.id}
                carta={carta}
                totalCatalogo={stats.totalCartas}
                prioridade={i < 3}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- Recursos ---------- */}
      <section id="recursos" className="border-y border-borda bg-superficie py-20">
        <div className="container-site">
          <h2 className="text-2xl font-bold sm:text-3xl">Como funciona</h2>
          <p className="mt-2 max-w-2xl text-textoFraco">
            Tudo por comandos de barra. Sem site, sem cadastro, sem instalar nada.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((r) => (
              <div key={r.titulo} className="cartao p-6">
                <div className="text-3xl">{r.emoji}</div>
                <h3 className="mt-4 text-lg font-semibold">{r.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textoFraco">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Raridades ---------- */}
      <section className="container-site py-20">
        <h2 className="text-2xl font-bold sm:text-3xl">As cinco raridades</h2>
        <p className="mt-2 max-w-2xl text-textoFraco">
          Quanto mais famoso o personagem, mais rara a carta. E quanto mais rara,
          melhores os atributos em batalha.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ORDEM_RARIDADES.map((chave) => {
            const r = RARIDADES[chave];
            const quantidade = stats.cartasPorRaridade[chave] ?? 0;
            return (
              <Link
                key={chave}
                href={`/cartas?raridade=${encodeURIComponent(chave)}`}
                className="cartao p-5 transition-colors hover:bg-superficie2"
                style={{ borderColor: `${r.cor}55` }}
              >
                <div className="text-2xl">{r.emoji}</div>
                <div className="mt-3 font-semibold" style={{ color: r.cor }}>
                  {r.label}
                </div>
                <div className="mt-1 text-sm text-textoFraco">
                  {new Intl.NumberFormat('pt-BR').format(quantidade)} cartas
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Notícias ---------- */}
      <section id="noticias" className="border-t border-borda bg-superficie py-20">
        <div className="container-site">
          <h2 className="text-2xl font-bold sm:text-3xl">Novidades</h2>
          <p className="mt-2 text-textoFraco">O que mudou no jogo recentemente.</p>

          {noticiaDestaque && (
            <article className="cartao mt-8 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    background: `${ETIQUETAS[noticiaDestaque.etiqueta].cor}22`,
                    color: ETIQUETAS[noticiaDestaque.etiqueta].cor
                  }}
                >
                  {ETIQUETAS[noticiaDestaque.etiqueta].label}
                </span>
                <time className="text-xs text-textoFraco" dateTime={noticiaDestaque.data}>
                  {formatarData(noticiaDestaque.data)}
                </time>
              </div>
              <h3 className="mt-4 text-xl font-bold sm:text-2xl">{noticiaDestaque.titulo}</h3>
              <p className="mt-3 leading-relaxed text-textoFraco">{noticiaDestaque.resumo}</p>
            </article>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {outrasNoticias.map((n) => (
              <article key={n.id} className="cartao p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{
                      background: `${ETIQUETAS[n.etiqueta].cor}22`,
                      color: ETIQUETAS[n.etiqueta].cor
                    }}
                  >
                    {ETIQUETAS[n.etiqueta].label}
                  </span>
                  <time className="text-xs text-textoFraco" dateTime={n.data}>
                    {formatarData(n.data)}
                  </time>
                </div>
                <h3 className="mt-3 font-semibold leading-snug">{n.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textoFraco">{n.resumo}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Chamada final ---------- */}
      <section className="container-site py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Comece a colecionar hoje</h2>
        <p className="mx-auto mt-4 max-w-xl text-textoFraco">
          Adicione o AniBattle ao seu servidor e use <code className="rounded bg-superficie2 px-1.5 py-0.5 text-sm">/roll</code> para
          ganhar sua primeira carta.
        </p>
        <a
          href={INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-primario mt-8 !px-8 !py-4 text-base"
        >
          Adicionar ao Discord
        </a>
      </section>
    </>
  );
}
