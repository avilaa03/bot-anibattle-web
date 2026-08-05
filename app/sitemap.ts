import type { MetadataRoute } from 'next';
import { listarCartas } from '@/lib/consultas';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://anibattle.com.br';

/**
 * Sitemap para o Google achar as páginas de carta.
 *
 * Limitado a 5.000 cartas: acima disso o arquivo fica grande demais e o
 * ideal passa a ser dividir em vários sitemaps.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/cartas`, changeFrequency: 'daily', priority: 0.9 },
    // Prioridade alta: é a página que responde "como isso funciona?", que
    // é o que alguém digita antes de conhecer o bot pelo nome.
    { url: `${SITE}/guia`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE}/vip`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/termos`, changeFrequency: 'yearly', priority: 0.3 }
  ];

  try {
    const { cartas } = await listarCartas({ pagina: 1, porPagina: 5000 });
    const paginasDeCarta: MetadataRoute.Sitemap = cartas
      .filter((c) => c.numero != null)
      .map((c) => ({
        url: `${SITE}/cartas/${c.numero}`,
        changeFrequency: 'monthly' as const,
        priority: 0.6
      }));
    return [...fixas, ...paginasDeCarta];
  } catch {
    // Banco fora do ar não pode quebrar o build.
    return fixas;
  }
}
