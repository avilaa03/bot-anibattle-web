import Link from 'next/link';
import { getSessao } from '@/lib/auth';
import { redirectUriEsperado } from '@/lib/discord';

export const metadata = { title: 'Entrar', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const ERROS: Record<string, string> = {
  cancelado: 'Você cancelou a autorização no Discord.',
  sem_codigo: 'O Discord não devolveu o código de autorização.',
  state_invalido: 'A sessão de login expirou ou o pedido não começou aqui. Tente de novo.',
  falha: 'Não foi possível concluir o login. Tente novamente em instantes.',
  configuracao: 'O login não está configurado no servidor. Avise o administrador.'
};

/** Em desenvolvimento, mostra o redirect_uri exato a cadastrar no portal. */
function DicaDesenvolvimento() {
  if (process.env.NODE_ENV === 'production') return null;

  const clientId = process.env.DISCORD_CLIENT_ID || '(não definido)';

  return (
    <div className="mt-8 max-w-lg rounded-lg border border-borda bg-superficie p-4 text-left text-xs text-textoFraco">
      <p className="font-medium text-texto">Diagnóstico (só aparece em desenvolvimento)</p>
      <p className="mt-2">
        Se o Discord recusar com <em>invalid redirect_uri</em>, cadastre exatamente esta URL em
        Developer Portal → OAuth2 → Redirects, <strong className="text-texto">na aplicação de
        client_id {clientId}</strong>:
      </p>
      <code className="mt-2 block break-all rounded bg-superficie2 p-2">
        {redirectUriEsperado()}
      </code>
    </div>
  );
}

export default async function PaginaEntrar({
  searchParams
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const sessao = await getSessao();

  if (sessao) {
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-6 text-2xl font-bold">Você já está conectado</h1>
        <p className="mt-3 text-textoFraco">
          Entrou como <strong className="text-texto">{sessao.nome}</strong>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="botao-primario">Ir para o site</Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="botao-secundario">Sair</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">🎴</div>
      <h1 className="mt-6 text-2xl font-bold">Entrar no AniBattle</h1>
      <p className="mt-3 max-w-md text-textoFraco">
        Use sua conta do Discord — a mesma com que você joga. Pedimos apenas seu nome,
        avatar e ID; nada além disso.
      </p>

      {erro && ERROS[erro] && (
        <p className="mt-6 max-w-md rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {ERROS[erro]}
        </p>
      )}

      <a href="/api/auth/login" className="botao-primario mt-8">
        Entrar com Discord
      </a>

      <DicaDesenvolvimento />
    </div>
  );
}
