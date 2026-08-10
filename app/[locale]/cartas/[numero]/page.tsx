import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CartaVisual from '@/components/CartaVisual';
import { buscarCartaPorNumero, cartasDaMesmaSerie, contarCartas, REVALIDATE } from '@/lib/consultas';
import { getRaridade, formatarNumero, formatarMoedas } from '@/lib/raridades';
import { traduzir } from '@/lib/i18n';
import { ehIdioma, LOCALE_FORMATO, type Idioma } from '@/lib/i18n/config';

export const revalidate = 300;

interface Props {
  params: Promise<{ locale: string; numero: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, numero } = await params;
  const t = traduzir(ehIdioma(locale) ? locale : 'pt');
  const carta = await buscarCartaPorNumero(parseInt(numero, 10));

  if (!carta) return { title: t('carta.nao_encontrada') };

  const meta = getRaridade(carta.raridade);
  const raridade = t(`raridades.${meta.chave}`).toLowerCase();

  return {
    title: `${carta.nome} — ${carta.serie}`,
    description: t('carta.descricao', {
      nome: carta.nome,
      serie: carta.serie,
      raridade,
      overall: carta.overall,
      ata: carta.ATA,
      lif: carta.LIF,
      pow: carta.POW
    }),
    openGraph: {
      title: t('carta.og_titulo', { nome: carta.nome }),
      description: t('carta.og_descricao', {
        raridade,
        serie: carta.serie,
        overall: carta.overall
      }),
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
  const { locale, numero } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);
  const href = (c: string) => `/${idioma}${c}`;

  const n = parseInt(numero, 10);

  if (Number.isNaN(n)) notFound();

  const carta = await buscarCartaPorNumero(n);
  if (!carta) notFound();

  const [relacionadas, totalCatalogo] = await Promise.all([
    cartasDaMesmaSerie(carta.serie, n),
    contarCartas()
  ]);

  const meta = getRaridade(carta.raridade);
  const raridade = t(`raridades.${meta.chave}`);
  const serieHref = href(`/cartas?serie=${encodeURIComponent(carta.serie)}`);

  return (
    <div className="container-site py-12">
      <nav className="mb-8 text-sm text-textoFraco">
        <Link href={href('/cartas')} className="hover:text-texto">{t('carta.catalogo')}</Link>
        <span className="mx-2">/</span>
        <Link href={serieHref} className="hover:text-texto">
          {carta.serie}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-texto">{carta.nome}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <div className="mx-auto w-full max-w-[300px]">
          <CartaVisual carta={carta} idioma={idioma} totalCatalogo={totalCatalogo} prioridade />
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
              {meta.emoji} {raridade}
            </span>
          </div>

          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{carta.nome}</h1>
          <Link
            href={serieHref}
            className="mt-2 inline-block text-lg text-textoFraco hover:text-texto"
          >
            {carta.serie}
          </Link>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="cartao p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
                {t('carta.atributos')}
              </h2>
              <div className="mt-4 space-y-4">
                <Atributo rotulo={t('atributos.ata')} valor={carta.ATA} maximo={100} cor="#E53935" />
                <Atributo rotulo={t('atributos.lif')} valor={carta.LIF} maximo={250} cor="#4CAF50" />
                <Atributo rotulo={t('atributos.pow')} valor={carta.POW} maximo={100} cor="#FF9800" />
              </div>
            </div>

            <div className="cartao p-6">
              <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
                {t('carta.informacoes')}
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-textoFraco">{t('carta.overall')}</dt>
                  <dd className="font-bold">{carta.overall}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">{t('carta.valor_mercado')}</dt>
                  <dd className="font-bold">
                    🪙 {formatarMoedas(carta.valorMercado, LOCALE_FORMATO[idioma])}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">{t('carta.venda_rapida')}</dt>
                  <dd className="font-bold">
                    🪙 {formatarMoedas(carta.valorVenda, LOCALE_FORMATO[idioma])}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-textoFraco">{t('carta.raridade')}</dt>
                  <dd className="font-bold" style={{ color: meta.cor }}>{raridade}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="cartao mt-6 p-6">
            <h2 className="text-sm font-medium uppercase tracking-wider text-textoFraco">
              {t('carta.como_conseguir')}
            </h2>
            {/*
              Os <code> vêm do dicionário porque a frase os intercala. Os
              nomes dos comandos NÃO se traduzem: só `/idioma` tem nome
              localizado no Discord (`/language`), então `/roll`, `/market`
              e `/desejar` são o que o jogador digita nos três idiomas.
            */}
            <p
              className="mt-3 text-sm leading-relaxed text-textoFraco
                         [&_code]:rounded [&_code]:bg-superficie2 [&_code]:px-1.5 [&_code]:py-0.5"
              dangerouslySetInnerHTML={{ __html: t('carta.como_texto', { nome: carta.nome }) }}
            />
          </div>
        </div>
      </div>

      {relacionadas.length > 0 && (
        <section className="mt-20">
          <h2 className="text-2xl font-bold">
            {t('carta.outras_da_serie', { serie: carta.serie })}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {relacionadas.map((c) => (
              <CartaVisual key={c.id} carta={c} idioma={idioma} totalCatalogo={totalCatalogo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
