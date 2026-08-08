'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IDIOMAS, ROTULOS, type Idioma } from '@/lib/i18n/config';

/**
 * Troca de idioma: três botões lado a lado.
 *
 * ## Por que são links, e não botões com onClick
 *
 * Cada idioma é uma URL de verdade. Com `<Link>`, o visitante pode abrir
 * em nova aba, copiar o endereço em espanhol e mandar para alguém, e o
 * Google enxerga os três como páginas navegáveis. Um `onClick` que
 * trocasse estado no cliente não daria nada disso.
 *
 * ## Por que troca a página equivalente, e não volta para a home
 *
 * Quem está lendo o guia em português e clica em EN quer o guia em
 * inglês, não a home. O caminho é preservado; só o primeiro segmento
 * (o idioma) é substituído.
 */
export default function SeletorIdioma({ atual }: { atual: Idioma }) {
  const pathname = usePathname() || '/';

  // O primeiro segmento é sempre o idioma (o middleware garante), então
  // trocar de idioma é trocar esse segmento e manter o resto.
  const semIdioma = (() => {
    const partes = pathname.split('/').filter(Boolean);
    if (partes.length > 0 && (IDIOMAS as readonly string[]).includes(partes[0])) {
      partes.shift();
    }
    return partes.length ? `/${partes.join('/')}` : '';
  })();

  return (
    <div
      role="group"
      aria-label={ROTULOS[atual].nome}
      className="inline-flex items-center rounded-lg border border-borda bg-superficie p-0.5"
    >
      {IDIOMAS.map((idioma) => {
        const ativo = idioma === atual;
        return (
          <Link
            key={idioma}
            href={`/${idioma}${semIdioma}`}
            // Diz ao buscador que este link leva a outra versão de idioma
            // da mesma página — reforça o hreflang do <head>.
            hrefLang={idioma}
            aria-current={ativo ? 'true' : undefined}
            title={ROTULOS[idioma].nome}
            className={[
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              ativo
                ? 'bg-marca text-white'
                : 'text-textoFraco hover:bg-superficie2 hover:text-texto'
            ].join(' ')}
          >
            {/* A bandeira some no mobile: três bandeiras mais três siglas
                estouram a barra em tela estreita, e a sigla sozinha já
                identifica o idioma. */}
            <span className="hidden sm:inline" aria-hidden="true">
              {ROTULOS[idioma].bandeira}{' '}
            </span>
            {ROTULOS[idioma].curto}
            <span className="sr-only"> — {ROTULOS[idioma].nome}</span>
          </Link>
        );
      })}
    </div>
  );
}
