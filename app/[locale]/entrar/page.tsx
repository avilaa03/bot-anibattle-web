import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessao } from '@/lib/auth';
import { redirectUriEsperado } from '@/lib/discord';
import { traduzir, type Tradutor } from '@/lib/i18n';
import { ehIdioma, type Idioma } from '@/lib/i18n/config';

export const metadata = { title: 'Entrar', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/**
 * O erro vem como código na query (`?erro=state_invalido`), não como
 * texto. É o que permite traduzi-lo: quem redireciona para cá é a rota
 * de callback, que não sabe em que idioma o visitante está.
 */
const CHAVE_DO_ERRO: Record<string, string> = {
  cancelado: 'entrar.erro_cancelou',
  sem_codigo: 'entrar.erro_sem_codigo',
  state_invalido: 'entrar.erro_expirou',
  falha: 'entrar.erro_generico',
  configuracao: 'entrar.erro_config'
};

/** Em desenvolvimento, mostra o redirect_uri exato a cadastrar no portal. */
function DicaDesenvolvimento({ t }: { t: Tradutor }) {
  if (process.env.NODE_ENV === 'production') return null;

  const clientId = process.env.DISCORD_CLIENT_ID || t('entrar.nao_definido');

  return (
    <div className="mt-8 max-w-lg rounded-lg border border-borda bg-superficie p-4 text-left text-xs text-textoFraco">
      <p className="font-medium text-texto">{t('entrar.diagnostico')}</p>
      <p className="mt-2">
        {/* O <em> vem do dicionário porque a ênfase cai sobre o termo em
            inglês `invalid redirect_uri`, que não se traduz. */}
        <span dangerouslySetInnerHTML={{ __html: t('entrar.dica_texto') }} />{' '}
        <strong className="text-texto">{t('entrar.dica_app', { id: clientId })}</strong>:
      </p>
      <code className="mt-2 block break-all rounded bg-superficie2 p-2">
        {redirectUriEsperado()}
      </code>
    </div>
  );
}

export default async function PaginaEntrar({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;
  const t = traduzir(idioma);

  const { erro } = await searchParams;
  const sessao = await getSessao();

  if (sessao) {
    return (
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-5xl">✅</div>
        <h1 className="mt-6 text-2xl font-bold">{t('entrar.ja_conectado')}</h1>
        <p className="mt-3 text-textoFraco">
          {t('entrar.entrou_como')} <strong className="text-texto">{sessao.nome}</strong>.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${idioma}`} className="botao-primario">{t('entrar.ir_site')}</Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="botao-secundario">{t('nav.sair')}</button>
          </form>
        </div>
      </div>
    );
  }

  const chaveErro = erro ? CHAVE_DO_ERRO[erro] : null;

  return (
    <div className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">🎴</div>
      <h1 className="mt-6 text-2xl font-bold">{t('entrar.titulo')}</h1>
      <p className="mt-3 max-w-md text-textoFraco">{t('entrar.explicacao')}</p>

      {chaveErro && (
        <p className="mt-6 max-w-md rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {t(chaveErro)}
        </p>
      )}

      <a href="/api/auth/login" className="botao-primario mt-8">
        {t('entrar.botao')}
      </a>

      <DicaDesenvolvimento t={t} />
    </div>
  );
}
