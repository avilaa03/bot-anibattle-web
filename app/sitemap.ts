import type { MetadataRoute } from 'next';
import { listarCartas } from '@/lib/consultas';
import { IDIOMAS, IDIOMA_PADRAO } from '@/lib/i18n/config';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://anibattle.com.br';

/**
 * Sitemap para o Google achar as páginas — nos três idiomas.
 *
 * Cada endereço entra uma vez, no idioma padrão, com as outras versões
 * declaradas em `alternates.languages`. Listar as três como URLs
 * separadas também funcionaria, mas triplicaria o arquivo e não diria ao
 * buscador que elas são a mesma página — que é justamente o que evita
 * ser tratado como conteúdo duplicado.
 *
 * Limitado a 5.000 cartas: acima disso o arquivo fica grande demais e o
 * ideal passa a ser dividir em vários sitemaps.
 */

/** Monta a entrada de um caminho com as três versões declaradas. */
function comIdiomas(
  caminho: string,
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE}/${IDIOMA_PADRAO}${caminho}`,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(IDIOMAS.map((i) => [i, `${SITE}/${i}${caminho}`]))
    }
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fixas: MetadataRoute.Sitemap = [
    comIdiomas('', 'weekly', 1),
    comIdiomas('/cartas', 'daily', 0.9),
    // Prioridade alta: é a página que responde "como isso funciona?", que
    // é o que alguém digita antes de conhecer o bot pelo nome.
    comIdiomas('/guia', 'monthly', 0.9),
    comIdiomas('/vip', 'monthly', 0.8),
    comIdiomas('/privacidade', 'yearly', 0.3),
    comIdiomas('/termos', 'yearly', 0.3)
  ];

  try {
    const { cartas } = await listarCartas({ pagina: 1, porPagina: 5000 });
    const paginasDeCarta: MetadataRoute.Sitemap = cartas
      .filter((c) => c.numero != null)
      .map((c) => comIdiomas(`/cartas/${c.numero}`, 'monthly', 0.6));
    return [...fixas, ...paginasDeCarta];
  } catch {
    // Banco fora do ar não pode quebrar o build.
    return fixas;
  }
}
