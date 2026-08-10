import Link from 'next/link';
import CartaVisual from '@/components/CartaVisual';
import { cartasDestaque, estatisticas, REVALIDATE } from '@/lib/consultas';
import { ETIQUETAS, formatarData } from '@/lib/noticias';
import { listarNoticias } from '@/lib/noticiasDb';
import { RARIDADES, ORDEM_RARIDADES } from '@/lib/raridades';
import { traduzir, formatarNumero } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';

// Revalida a cada 5 min: os números mudam devagar e assim a home é
// servida do cache, sem bater no Mongo a cada visita.
export const revalidate = 300;

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

type Recurso = { emoji: string; titulo: string; texto: string };

export default async function PaginaInicial({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const href = (c: string) => `/${idioma}${c}`;
  const RECURSOS = t.dados<Recurso[]>('home.recursos');
  const n = (v: number) => formatarNumero(v, idioma);

  const [stats, destaques, noticias] = await Promise.all([
    estatisticas(),
    cartasDestaque(5),
    // As notícias vêm do banco (editadas em /admin/noticias). Rascunhos
    // não entram: `listarNoticias` filtra por `publicada` por padrão.
    listarNoticias({ limite: 4 })
  ]);

  const numeros = [
    { valor: stats.totalCartas, rotulo: t('home.num_cartas') },
    { valor: stats.totalSeries, rotulo: t('home.num_series') },
    { valor: stats.totalJogadores, rotulo: t('home.num_jogadores') },
    { valor: stats.totalDescobertas, rotulo: t('home.num_descobertas') }
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
            {t('home.eyebrow')}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
            {t('home.titulo_1')}
            <br />
            <span className="text-marca">{t('home.titulo_2')}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-textoFraco">
            {t('home.subtitulo')}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href={INVITE} target="_blank" rel="noopener noreferrer" className="botao-primario">
              {t('home.cta_adicionar')}
            </a>
            <Link href={href('/cartas')} className="botao-secundario">
              {t('home.cta_catalogo')}
            </Link>
          </div>

          {/* Números reais, direto do banco do bot */}
          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {numeros.map((numero) => (
              <div key={numero.rotulo}>
                <dt className="text-3xl font-bold sm:text-4xl">
                  {n(numero.valor)}
                </dt>
                <dd className="mt-1 text-xs text-textoFraco sm:text-sm">{numero.rotulo}</dd>
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
              <h2 className="text-2xl font-bold sm:text-3xl">{t('home.raras_titulo')}</h2>
              <p className="mt-2 text-textoFraco">{t('home.raras_texto')}</p>
            </div>
            <Link href={href('/cartas')} className="shrink-0 text-sm text-marca hover:underline">
              {t('home.ver_todas')}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {destaques.map((carta, i) => (
              <CartaVisual
                key={carta.id}
                carta={carta}
                idioma={idioma}
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
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.como_funciona')}</h2>
          <p className="mt-2 max-w-2xl text-textoFraco">{t('home.como_funciona_texto')}</p>

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
        <h2 className="text-2xl font-bold sm:text-3xl">{t('home.raridades_titulo')}</h2>
        <p className="mt-2 max-w-2xl text-textoFraco">{t('home.raridades_texto')}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ORDEM_RARIDADES.map((chave) => {
            const r = RARIDADES[chave];
            const quantidade = stats.cartasPorRaridade[chave] ?? 0;
            return (
              <Link
                key={chave}
                href={href(`/cartas?raridade=${encodeURIComponent(chave)}`)}
                className="cartao p-5 transition-colors hover:bg-superficie2"
                style={{ borderColor: `${r.cor}55` }}
              >
                <div className="text-2xl">{r.emoji}</div>
                <div className="mt-3 font-semibold" style={{ color: r.cor }}>
                  {t(`raridades.${chave}`)}
                </div>
                <div className="mt-1 text-sm text-textoFraco">
                  {t('home.raridade_contagem', { n: n(quantidade) })}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ---------- Notícias ---------- */}
      <section id="noticias" className="border-t border-borda bg-superficie py-20">
        <div className="container-site">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.novidades')}</h2>
          <p className="mt-2 text-textoFraco">{t('home.novidades_texto')}</p>

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
                  {t(`etiquetas.${noticiaDestaque.etiqueta}`)}
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
                    {t(`etiquetas.${n.etiqueta}`)}
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
        <h2 className="text-3xl font-bold sm:text-4xl">{t('home.final_titulo')}</h2>
        <p className="mx-auto mt-4 max-w-xl text-textoFraco">
          {t('home.final_texto', { comando: '§CMD§' }).split('§CMD§').flatMap((parte, i) =>
            i === 0
              ? [parte]
              : [<code key="c" className="rounded bg-superficie2 px-1.5 py-0.5 text-sm">/roll</code>, parte]
          )}
        </p>
        <a
          href={INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="botao-primario mt-8 !px-8 !py-4 text-base"
        >
          {t('nav.adicionar')}
        </a>
      </section>
    </>
  );
}
