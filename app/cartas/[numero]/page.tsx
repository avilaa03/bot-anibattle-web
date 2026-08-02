import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CartaVisual from '@/components/CartaVisual';
import { buscarCartaPorNumero, cartasDaMesmaSerie, contarCartas, REVALIDATE } from '@/lib/consultas';
import { getRaridade, formatarNumero, formatarMoedas } from '@/lib/raridades';

export const revalidate = REVALIDATE;

interface Props {
  params: Promise<{ numero: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { numero } = await params;
  const carta = await buscarCartaPorNumero(parseInt(numero, 10));

  if (!carta) return { title: 'Carta não encontrada' };

  const meta = getRaridade(carta.raridade);
  return {
    title: `${carta.nome} — ${carta.serie}`,
    description:
      `${carta.nome} de ${carta.serie} no AniBattle. Carta ${meta.label.toLowerCase()}, `
      + `overall ${carta.overall}. ATA ${carta.ATA}, LIF ${carta.LIF}, POW ${carta.POW}.`,
    openGraph: {
      title: `${carta.nome} — AniBattle`,
      description: `Carta ${meta.label.toLowerCase()} de ${carta.serie}. Overall ${carta.overall}.`,
      images: carta.imagem ? [{ url: carta.imagem }] : undefined
    }
  };
}

/** Barra de atributo, com o mesmo teto que o bot usa nas barras do embed. */
function Atributo({ rotulo, valor, maximo, cor }: {
  rotulo: string; valor: number; maximo: number; cor: string;
}) {
  const proporcao = Math.min(100, (valor / maximo) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono text-textoFraco">{rotulo}</span>
        <span className="font-bold">{valor}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-superficie2">
        <div className="h-full rounded-full" style={{ width: `${proporcao}%`, background: cor }} />
      </div>
    </div>
  );
}

export default async function PaginaCarta({ params }: Props) {
  const { numero } = await params;
  const n = parseInt(numero, 10);

  if (Number.isNaN(n)) notFound();

  const carta = await buscarCartaPorNumero(n);
  if (!carta) notFound();

  const [relacionadas, totalCatalogo] = await Promise.all([
    cartasDaMesmaSerie(carta.serie, n),
    contarCartas()
  ]);

  const meta = getRaridade(carta.raridade);

  return (
    <div className="container-site py-12">
      <nav className="mb-8 text-sm text-textoFraco">
        <Link href="/cartas" className="hover:text-texto">Catálogo</Link>
        <span className="mx-2">/</span>
        <Link
          href={`/cartas?serie=${encodeURIComponent(carta.serie)}`}
          className="hover:text-texto"
        >
          {carta.serie}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-texto">{carta.nome}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <div className="mx-auto w-full max-w-[300px]">
          <CartaVisual carta={carta} totalCatalogo={totalCatalogo} prioridade />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg text-textoFraco">
              {formatarNumero(carta.numero, totalCatalogo)}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: meta.cor, color: meta.corTexto, background: `${meta.cor}22` }}
            >
              {meta.emoji} {meta.label}
            </span>
          </div>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{carta.nome}</h1>
          <Link
            href={`/cartas?serie=${encodeURIComponent(carta.serie)}`}
            className="mt-2 inline-block text-lg text-textoFraco hover:text-texto"
          >
            {carta.serie}
          </Link>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="cartao p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
                Atributos
              </h2>
              <div className="mt-4 space-y-4">
                <Atributo rotulo="ATA" valor={carta.ATA} maximo={100} cor="#E53935" />
                <Atributo rotulo="LIF" valor={carta.LIF} maximo={250} cor="#4CAF50" />
                <Atributo rotulo="POW" valor={carta.POW} maximo={100} cor="#FF9800" />
              </div>
            </div>

            <div className="cartao p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
                Informações
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-textoFraco">Overall</dt>
                  <dd className="font-bold">{carta.overall}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">Valor de mercado</dt>
                  <dd className="font-bold">🪙 {formatarMoedas(carta.valorMercado)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">Venda rápida</dt>
                  <dd className="font-bold">🪙 {formatarMoedas(carta.valorMercado / 2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">Raridade</dt>
                  <dd className="font-bold" style={{ color: meta.cor }}>{meta.label}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="cartao mt-6 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
              Como conseguir
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-textoFraco">
              Use <code className="rounded bg-superficie2 px-1.5 py-0.5">/roll</code> no Discord para
              sortear cartas, procure no{' '}
              <code className="rounded bg-superficie2 px-1.5 py-0.5">/market</code> se alguém estiver
              vendendo, ou marque com{' '}
              <code className="rounded bg-superficie2 px-1.5 py-0.5">/desejar {carta.nome}</code> para
              ser avisado quando alguém rolar esta carta.
            </p>
          </div>
        </div>
      </div>

      {relacionadas.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold">Outras cartas de {carta.serie}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {relacionadas.map((c) => (
              <CartaVisual key={c.id} carta={c} totalCatalogo={totalCatalogo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
