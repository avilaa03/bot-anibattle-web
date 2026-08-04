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
          Não existe mais botão "Entrar" para o público.

          O login só serve para o painel administrativo — não há área de
          jogador, perfil nem compra pelo site ainda. Um "Entrar" no topo
          prometia algo que não existe: quem clicava entrava com o Discord
          e caía numa tela dizendo que não tem permissão.

          Para o admin, o caminho é o link "Administração" no rodapé, e
          uma vez logado o botão "Painel" aparece aqui.

          Quando existir perfil público de jogador ou compra de VIP pelo
          site, o "Entrar" volta — aí ele passa a servir para todo mundo.
        */}
        <div className="flex items-center gap-3">
          {sessao && ehAdmin(sessao) && (
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
