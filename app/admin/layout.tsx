import Link from 'next/link';
import { getSessao, ehAdmin, idsAdmin, urlAvatar } from '@/lib/auth';

export const metadata = {
  title: 'Administração',
  robots: { index: false, follow: false }
};

// Nunca cachear: o conteúdo depende de quem está logado.
export const dynamic = 'force-dynamic';

const MENU = [
  { href: '/admin', label: 'Visão geral' },
  { href: '/admin/jogadores', label: 'Jogadores' },
  { href: '/admin/cartas', label: 'Cartas' },
  { href: '/admin/economia', label: 'Economia' },
  { href: '/admin/noticias', label: 'Notícias' },
  { href: '/admin/sistema', label: 'Sistema' },
  { href: '/admin/auditoria', label: 'Auditoria' }
];

/**
 * Casca do painel administrativo.
 *
 * A verificação de acesso fica aqui no layout, então TODA página dentro
 * de /admin herda a proteção automaticamente. Se a checagem estivesse em
 * cada página, bastaria esquecer numa para abrir um buraco.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();

  // Sem login: manda entrar.
  if (!sessao) {
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-6 text-2xl font-bold">Acesso restrito</h1>
        <p className="mt-3 max-w-md text-textoFraco">
          Você precisa entrar com o Discord para acessar a administração.
        </p>
        <a href="/api/auth/login" className="botao-primario mt-8">
          Entrar com Discord
        </a>
      </div>
    );
  }

  // Logado, mas sem permissão.
  if (!ehAdmin(sessao)) {
    const semConfiguracao = idsAdmin().length === 0;
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-5xl">⛔</div>
        <h1 className="mt-6 text-2xl font-bold">Sem permissão</h1>
        <p className="mt-3 max-w-md text-textoFraco">
          Sua conta (<code className="rounded bg-superficie2 px-1.5 py-0.5">{sessao.id}</code>) não
          tem acesso ao painel.
        </p>
        {semConfiguracao && (
          <p className="mt-4 max-w-md rounded-lg border border-borda bg-superficie p-4 text-sm text-textoFraco">
            ⚠️ <strong className="text-texto">ADMIN_DISCORD_IDS não está configurado.</strong> Enquanto
            estiver vazio, ninguém entra — é proposital, para uma variável esquecida não virar
            painel aberto. Adicione seu ID no <code>.env.local</code>.
          </p>
        )}
        <Link href="/" className="botao-secundario mt-8">Voltar ao site</Link>
      </div>
    );
  }

  return (
    <div className="container-site py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-borda pb-6">
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="mt-1 text-sm text-textoFraco">
            Conectado como <strong className="text-texto">{sessao.nome}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlAvatar(sessao.id, sessao.avatar)}
            alt=""
            width={36}
            height={36}
            className="rounded-full"
          />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="botao-secundario !py-2 !px-4">Sair</button>
          </form>
        </div>
      </div>

      <nav className="mb-8 flex flex-wrap gap-2">
        {MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-borda px-4 py-2 text-sm text-textoFraco transition-colors hover:bg-superficie hover:text-texto"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
