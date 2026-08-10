import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import CartaVisual from '@/components/CartaVisual';
import FiltrosCartas from '@/components/FiltrosCartas';
import { listarCartas, listarSeries, contarCartas, REVALIDATE } from '@/lib/consultas';
import { getRaridade, RARIDADES, ORDEM_RARIDADES } from '@/lib/raridades';
import { traduzir, formatarNumero } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';
import { notFound } from 'next/navigation';

export const revalidate = 300;

const POR_PAGINA = 24;

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params: rota, searchParams }: Props): Promise<Metadata> {
  const { locale } = await rota;
  const t = traduzir(ehIdioma(locale) ? locale : 'pt');
  const params = await searchParams;
  const raridade = typeof params.raridade === 'string' ? params.raridade : undefined;
  const serie = typeof params.serie === 'string' ? params.serie : undefined;

  // Título específico ajuda o Google a indexar cada filtro como página útil.
  let titulo = t('cartas.titulo');
  if (serie) titulo = t('cartas.titulo_serie', { serie });
  // O plural vem do dicionário, não de somar "s": "comum" viraria
  // "comums" em português e "común" viraria "comúns" em espanhol.
  else if (raridade) {
    titulo = t('cartas.titulo_raridade', {
      raridade: t(`raridades_plural.${getRaridade(raridade).chave}`)
    });
  }

  return {
    title: titulo,
    description: (serie ? t('cartas.desc_serie', { serie }) : t('cartas.desc_geral'))
      + ' ' + t('cartas.descricao')
  };
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaCartas({ params: rota, searchParams }: Props) {
  const { locale } = await rota;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const params = await searchParams;

  const pagina = Math.max(1, parseInt(primeiro(params.pagina) ?? '1', 10) || 1);
  const raridade = primeiro(params.raridade);
  const serie = primeiro(params.serie);
  const busca = primeiro(params.busca);
  const ordem = (primeiro(params.ordem) ?? 'numero') as 'numero' | 'overall' | 'nome';

  const [resultado, series, totalCatalogo] = await Promise.all([
    listarCartas({ pagina, porPagina: POR_PAGINA, raridade, serie, busca, ordem }),
    listarSeries(),
    contarCartas()
  ]);

  const { cartas, total, paginas } = resultado;

  // Preserva os filtros ao trocar de página. O prefixo de idioma entra
  // aqui: sem ele o middleware redecide o idioma e a paginação em inglês
  // devolve o visitante ao português na segunda página.
  function linkPagina(numero: number): string {
    const p = new URLSearchParams();
    if (raridade) p.set('raridade', raridade);
    if (serie) p.set('serie', serie);
    if (busca) p.set('busca', busca);
    if (ordem !== 'numero') p.set('ordem', ordem);
    if (numero > 1) p.set('pagina', String(numero));
    const query = p.toString();
    return query ? `/${idioma}/cartas?${query}` : `/${idioma}/cartas`;
  }

  return (
    <div className="container-site py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('cartas.titulo')}</h1>
        <p className="mt-2 text-textoFraco">
          {t('cartas.intro', { n: formatarNumero(totalCatalogo, idioma) })}
        </p>
      </header>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-superficie" />}>
        <FiltrosCartas
          series={series}
          idioma={idioma}
          totalFormatado={formatarNumero(total, idioma)}
          raridades={ORDEM_RARIDADES.map((chave) => ({
            chave,
            emoji: RARIDADES[chave].emoji,
            cor: RARIDADES[chave].cor,
            label: t(`raridades.${chave}`)
          }))}
          textos={{
            buscar_placeholder: t('filtros.buscar_placeholder'),
            buscar_aria: t('filtros.buscar_aria'),
            buscar: t('filtros.buscar'),
            todas: t('filtros.todas'),
            todas_series: t('filtros.todas_series'),
            filtrar_serie: t('filtros.filtrar_serie'),
            ordenar: t('filtros.ordenar'),
            ordem_numero: t('filtros.ordem_numero'),
            ordem_overall: t('filtros.ordem_overall'),
            ordem_nome: t('filtros.ordem_nome'),
            limpar: t('filtros.limpar'),
            carregando: t('filtros.carregando'),
            contagem: t('filtros.contagem')
          }}
        />
      </Suspense>

      {cartas.length === 0 ? (
        <div className="cartao mt-10 p-12 text-center">
          <p className="text-lg font-medium">{t('cartas.vazio')}</p>
          <p className="mt-2 text-sm text-textoFraco">
            {t('cartas.vazio_dica')}{' '}
            <Link href={`/${idioma}/cartas`} className="text-marca hover:underline">
              {t('cartas.vazio_limpar')}
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {cartas.map((carta, i) => (
            <CartaVisual
              key={carta.id}
              carta={carta}
              idioma={idioma}
              totalCatalogo={totalCatalogo}
              prioridade={i < 6}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {paginas > 1 && (
        <nav
          className="mt-12 flex items-center justify-center gap-2"
          aria-label={t('cartas.paginacao')}
        >
          {pagina > 1 && (
            <Link href={linkPagina(pagina - 1)} className="botao-secundario !py-2 !px-4">
              ← {t('cartas.anterior')}
            </Link>
          )}

          <span className="px-4 text-sm text-textoFraco">
            {t('cartas.pagina_de', { atual: pagina, total: paginas })}
          </span>

          {pagina < paginas && (
            <Link href={linkPagina(pagina + 1)} className="botao-secundario !py-2 !px-4">
              {t('cartas.proxima')} →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
