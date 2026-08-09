import Link from 'next/link';
import { getSessao, ehAdmin, urlAvatar } from '@/lib/auth';
import { traduzir } from '@/lib/i18n';
import type { Idioma } from '@/lib/i18n/config';
import SeletorIdioma from './SeletorIdioma';
import AvatarAdmin from './AvatarAdmin';

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

/**
 * Três blocos, não uma fila só.
 *
 * Antes tudo ficava empilhado à direita: navegação, seletor de idioma,
 * admin e o botão de convite disputavam o mesmo canto, e o miolo da barra
 * ficava vazio. Agora o grid de três colunas dá âncoras fixas — logo à
 * esquerda, navegação no centro real da barra, ações à direita — e o
 * conjunto para de escorregar conforme o texto muda de tamanho entre os
 * idiomas ("Guia" x "Guide" x "Guía" somam larguras diferentes).
 *
 * As colunas laterais têm a mesma base (`1fr`), então a navegação fica
 * centralizada na tela, e não centralizada no espaço que sobrou.
 */
export default async function Cabecalho({ idioma }: { idioma: Idioma }) {
  const t = traduzir(idioma);

  // Todo link interno carrega o idioma: sem isso, navegar dentro do site
  // faria o middleware redecidir o idioma a cada clique e desfazer a
  // escolha do visitante.
  const href = (caminho: string) => `/${idioma}${caminho}`;

  const LINKS = [
    // O guia vem primeiro de propósito: é o que serve a quem chegou agora,
    // e quem chega agora é a maioria de quem abre o site.
    { href: href('/guia'), label: t('nav.guia') },
    { href: href('/cartas'), label: t('nav.cartas') },
    { href: href('/vip'), label: t('nav.vip') },
    { href: href('/#recursos'), label: t('nav.recursos') },
    { href: href('/#noticias'), label: t('nav.noticias') },
    { href: href('/#contato'), label: t('nav.contato') }
  ];

  // Pode falhar se SESSION_SECRET não estiver configurado — nesse caso o
  // site público continua funcionando, só sem área logada.
  let sessao = null;
  try {
    sessao = await getSessao();
  } catch {
    sessao = null;
  }

  const logado = sessao && ehAdmin(sessao);

  return (
    <header className="sticky top-0 z-50 border-b border-borda bg-fundo/85 backdrop-blur">
      <div className="container-site grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* ---------- Esquerda: marca ---------- */}
        <Link href={href('')} className="flex items-center gap-2 justify-self-start font-semibold">
          <span className="text-xl">🎴</span>
          <span className="text-lg">AniBattle</span>
        </Link>

        {/* ---------- Centro: navegação ---------- */}
        <nav className="hidden items-center gap-6 justify-self-center md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm text-textoFraco transition-colors hover:text-texto"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* ---------- Direita: ações, e o idioma por último ----------

          Não existe botão "Entrar" para o público.

          O login só serve para o painel administrativo — não há área de
          jogador, perfil nem compra pelo site ainda. Um "Entrar" no topo
          prometia algo que não existe: quem clicava entrava com o Discord
          e caía numa tela dizendo que não tem permissão.

          O que existe é o "Admin": de propósito discreto, porque é uma
          porta de serviço, não um convite ao visitante.
        */}
        <div className="flex items-center gap-3 justify-self-end">
          <a
            href={INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-primario !py-2 !px-4 whitespace-nowrap"
          >
            {t('nav.adicionar')}
          </a>

          {logado ? (
            <>
              <Link href="/admin" className="botao-secundario !py-2 !px-4 text-sm">
                {t('nav.painel')}
              </Link>
              <div className="hidden items-center sm:flex">
                <AvatarAdmin
                  src={urlAvatar(sessao!.id, sessao!.avatar)}
                  padrao={urlAvatar(sessao!.id, null)}
                  nome={sessao!.nome}
                />
              </div>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="botao-secundario !py-2 !px-3 text-xs">
                  {t('nav.sair')}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/admin"
              title={t('nav.admin_titulo')}
              aria-label={t('nav.admin_aria')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-2
                         text-xs font-medium text-textoFraco/60 transition-colors
                         hover:border-borda hover:bg-superficie hover:text-texto
                         focus-visible:border-borda focus-visible:text-texto focus-visible:outline-none"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path d="M12 3 4.5 6v5.2c0 4.4 3.1 8.5 7.5 9.8 4.4-1.3 7.5-5.4 7.5-9.8V6L12 3Z" />
              </svg>
              <span className="hidden sm:inline">{t('nav.admin')}</span>
            </Link>
          )}

          {/* Por último e separado por uma divisória: é configuração, não
              navegação, e não deve competir com o botão de convite. */}
          <div className="ml-1 border-l border-borda pl-3">
            <SeletorIdioma atual={idioma} />
          </div>
        </div>
      </div>
    </header>
  );
}
