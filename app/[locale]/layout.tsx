import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Cabecalho from '@/components/Cabecalho';
import Rodape from '@/components/Rodape';
import { IDIOMAS, ehIdioma, type Idioma } from '@/lib/i18n/config';
import { traduzir } from '@/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://anibattle.com.br';

/**
 * Gera as três versões no build.
 *
 * Sem isto, cada idioma só existiria sob demanda e a primeira visita a
 * `/es` pagaria a renderização inteira.
 */
export function generateStaticParams() {
  return IDIOMAS.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  if (!ehIdioma(locale)) return {};

  const t = traduzir(locale);

  // hreflang: diz ao Google que as três são a MESMA página em idiomas
  // diferentes, e não conteúdo duplicado. O `x-default` aponta para o
  // português, que é para onde vai quem não casa com nenhum idioma.
  const languages = Object.fromEntries(
    IDIOMAS.map((i) => [i, `${SITE_URL}/${i}`])
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('meta.titulo_padrao'), template: t('meta.template') },
    description: t('meta.descricao'),
    keywords: t('meta.palavras').split(', '),
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: { ...languages, 'x-default': `${SITE_URL}/pt` }
    },
    openGraph: {
      type: 'website',
      locale,
      url: `${SITE_URL}/${locale}`,
      siteName: 'AniBattle',
      title: t('meta.og_titulo'),
      description: t('meta.og_descricao')
    },
    twitter: {
      card: 'summary_large_image',
      title: t('meta.og_titulo'),
      description: t('meta.og_descricao')
    },
    robots: { index: true, follow: true }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Idioma inventado na URL (`/fr/guia`) vira 404 em vez de renderizar
  // uma página meio traduzida.
  if (!ehIdioma(locale)) notFound();

  const idioma = locale as Idioma;
  return (
    <html lang={idioma}>
      <body className="min-h-screen bg-fundo font-sans text-texto antialiased">
        <Cabecalho idioma={idioma} />
        <main className="min-h-[70vh]">{children}</main>
        <Rodape idioma={idioma} />
      </body>
    </html>
  );
}
