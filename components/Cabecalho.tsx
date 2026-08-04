import Link from 'next/link';
import { getSessao, ehAdmin, urlAvatar } from '@/lib/auth';

const INVITE = process.env.NEXT_PUBLIC_INVITE_URL || '#';

const LINKS = [
  { href: '/cartas', label: 'Cartas' },
  { href: '/vip', label: 'VIP' },
  { href: '/#recursos', label: 'Recursos' },
  { href: '/#noticias', label: 'Notícias' },
  { href: '/#contato', label: 'Contato' }
];

export default async function Cabecalho() {
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
        <Link href="/" className="flex items-center gap-2 font-semibold">
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

          O que existe é o "Admin" abaixo: de propósito discreto (sem
          preenchimento, texto apagado, ganha contorno só no hover), porque
          é uma porta de serviço, não um convite ao visitante. Ele leva a
          /admin, que já cuida do login pelo Discord quando não há sessão.

          Uma vez logado como administrador, ele dá lugar ao "Painel".

          Quando existir perfil público de jogador ou compra de VIP pelo
          site, o "Entrar" volta — aí ele passa a servir para todo mundo.
        */}
        <div className="flex items-center gap-3">
          {sessao && ehAdmin(sessao) ? (
            <>
              <Link href="/admin" className="botao-secundario !py-2 !px-4 text-sm">
                Painel
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
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/admin"
              title="Painel administrativo"
              aria-label="Entrar no painel administrativo"
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
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}

          <a
            href={INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-primario !py-2 !px-4"
          >
            Adicionar ao Discord
          </a>
        </div>
      </div>
    </header>
  );
}
