import Link from 'next/link';
import { traduzir } from '@/lib/i18n';
import type { Idioma } from '@/lib/i18n/config';

const SUPORTE = process.env.NEXT_PUBLIC_SUPPORT_URL || '#';
const REPO = 'https://github.com/avilaa03/bot_animefight';

/**
 * Todo link interno leva o idioma no caminho.
 *
 * Sem isso, clicar em "Catálogo" estando em espanhol jogaria o visitante
 * para `/cartas`, o middleware redirecionaria para o idioma do navegador,
 * e a pessoa perderia a escolha que tinha acabado de fazer.
 */
export default function Rodape({ idioma }: { idioma: Idioma }) {
  const t = traduzir(idioma);
  const href = (caminho: string) => `/${idioma}${caminho}`;

  return (
    <footer id="contato" className="mt-24 border-t border-borda bg-superficie">
      <div className="container-site grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🎴</span>
            <span>AniBattle</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-textoFraco">
            {t('rodape.sobre')}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium">{t('rodape.jogo')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li><Link href={href('/cartas')} className="hover:text-texto">{t('rodape.catalogo')}</Link></li>
            <li><Link href={href('/#recursos')} className="hover:text-texto">{t('rodape.como')}</Link></li>
            <li><Link href={href('/#noticias')} className="hover:text-texto">{t('rodape.noticias')}</Link></li>
            <li><Link href={href('/vip')} className="hover:text-texto">{t('rodape.planos')}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium">{t('rodape.suporte')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li>
              <a href={SUPORTE} target="_blank" rel="noopener noreferrer" className="hover:text-texto">
                {t('rodape.servidor')}
              </a>
            </li>
            <li>
              <a href={REPO} target="_blank" rel="noopener noreferrer" className="hover:text-texto">
                {t('rodape.codigo')}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium">{t('rodape.legal')}</h3>
          <ul className="mt-3 space-y-2 text-sm text-textoFraco">
            <li><Link href={href('/privacidade')} className="hover:text-texto">{t('rodape.privacidade')}</Link></li>
            <li><Link href={href('/termos')} className="hover:text-texto">{t('rodape.termos')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-borda">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-6 text-xs text-textoFraco sm:flex-row">
          <p>© {new Date().getFullYear()} AniBattle. {t('rodape.direitos')}</p>
          <p>{t('rodape.feito_com')}</p>
        </div>
      </div>
    </footer>
  );
}
