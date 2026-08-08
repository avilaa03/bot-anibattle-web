import Link from 'next/link';
import { getSessao, ehAdmin, urlAvatar } from '@/lib/auth';
import { traduzir } from '@/lib/i18n';
import type { Idioma } from '@/lib/i18n/config';
import SeletorIdioma from './SeletorIdioma';

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

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

  return (
    <header className="sticky top-0 z-50 border-b border-borda bg-fundo/85 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Link href={href('')} className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🎴</span>
          <span className="text-lg">AniBattle</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-textoFraco transition-colors hover:text-texto"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/*
          Não existe botão "Entrar" para o público.

          O login só serve para o painel administrativo — não há área de
          jogador, perfil nem compra pelo site ainda. Um "Entrar" no topo
          prometia algo que não existe: quem clicava entrava com o Discord
          e caía numa tela dizendo que não tem permissão.

          O que existe é o "Admin" abaixo: de propósito discreto, porque é
          uma porta de serviço, não um convite ao visitante.
        */}
        <div className="flex items-center gap-3">
          <SeletorIdioma atual={idioma} />

          {sessao && ehAdmin(sessao) ? (
            <>
              <Link href="/admin" className="botao-secundario !py-2 !px-4 text-sm">
                {t('nav.painel')}
              </Link>
              <div className="hidden items-center gap-2 sm:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlAvatar(sessao.id, sessao.avatar)}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
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

          <a
            href={INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-primario !py-2 !px-4"
          >
            {t('nav.adicionar')}
          </a>
        </div>
      </div>
    </header>
  );
}
