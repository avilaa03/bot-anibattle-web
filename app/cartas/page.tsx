import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import CartaVisual from '@/components/CartaVisual';
import FiltrosCartas from '@/components/FiltrosCartas';
import { listarCartas, listarSeries, contarCartas, REVALIDATE } from '@/lib/consultas';
import { getRaridade } from '@/lib/raridades';

export const revalidate = 300;

const POR_PAGINA = 24;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const raridade = typeof params.raridade === 'string' ? params.raridade : undefined;
  const serie = typeof params.serie === 'string' ? params.serie : undefined;

  // Título específico ajuda o Google a indexar cada filtro como página útil.
  let titulo = 'Catálogo de cartas';
  if (serie) titulo = `Cartas de ${serie}`;
  else if (raridade) titulo = `Cartas ${getRaridade(raridade).label.toLowerCase()}s`;

  return {
    title: titulo,
    description:
      `Veja todas as cartas do AniBattle${serie ? ` da série ${serie}` : ''}. `
      + 'Atributos, raridade e número na Pokédex de cada personagem.'
  };
}

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export default async function PaginaCartas({ searchParams }: Props) {
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

  // Preserva os filtros ao trocar de página.
  function linkPagina(numero: number): string {
    const p = new URLSearchParams();
    if (raridade) p.set('raridade', raridade);
    if (serie) p.set('serie', serie);
    if (busca) p.set('busca', busca);
    if (ordem !== 'numero') p.set('ordem', ordem);
    if (numero > 1) p.set('pagina', String(numero));
    const query = p.toString();
    return query ? `/cartas?${query}` : '/cartas';
  }

  return (
    <div className="container-site py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Catálogo de cartas</h1>
        <p className="mt-2 text-textoFraco">
          Todas as {new Intl.NumberFormat('pt-BR').format(totalCatalogo)} cartas do jogo,
          com atributos e número da Pokédex.
        </p>
      </header>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-superficie" />}>
        <FiltrosCartas series={series} total={total} />
      </Suspense>

      {cartas.length === 0 ? (
        <div className="cartao mt-10 p-12 text-center">
          <p className="text-lg font-medium">Nenhuma carta encontrada</p>
          <p className="mt-2 text-sm text-textoFraco">
            Tente outros filtros ou{' '}
            <Link href="/cartas" className="text-marca hover:underline">
              limpe a busca
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
              totalCatalogo={totalCatalogo}
              prioridade={i < 6}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {paginas > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Paginação">
          {pagina > 1 && (
            <Link href={linkPagina(pagina - 1)} className="botao-secundario !py-2 !px-4">
              ← Anterior
            </Link>
          )}

          <span className="px-4 text-sm text-textoFraco">
            Página {pagina} de {paginas}
          </span>

          {pagina < paginas && (
            <Link href={linkPagina(pagina + 1)} className="botao-secundario !py-2 !px-4">
              Próxima →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
