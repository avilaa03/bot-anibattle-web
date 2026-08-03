import Link from 'next/link';
import { listarAuditoria } from '@/lib/admin/auditoria';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Auditoria', robots: { index: false, follow: false } };

const POR_PAGINA = 50;

export default async function PaginaAuditoria({
  searchParams
}: {
  searchParams: Promise<{ alvo?: string; acao?: string; pagina?: string }>;
}) {
  const { alvo, acao, pagina: paginaTexto } = await searchParams;
  const pagina = Math.max(1, Number(paginaTexto) || 1);

  const { registros, total, paginas } = await listarAuditoria({
    pagina, porPagina: POR_PAGINA, alvoId: alvo, acao
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Auditoria</h2>
        <p className="mt-1 text-sm text-textoFraco">
          Tudo que o painel escreveu no banco, inclusive as tentativas que falharam.
          Este log não pode ser editado nem apagado pelo painel — de propósito.
        </p>
      </div>

      <form className="cartao flex flex-wrap items-end gap-3 p-4" action="/admin/auditoria">
        <div className="min-w-56 flex-1">
          <label className="rotulo" htmlFor="alvo">Filtrar por alvo (ID do jogador, carta ou notícia)</label>
          <input id="alvo" name="alvo" defaultValue={alvo ?? ''} className="campo mt-1" placeholder="Deixe vazio para ver tudo" />
        </div>
        <button type="submit" className="botao-primario">Filtrar</button>
        {(alvo || acao) && (
          <Link href="/admin/auditoria" className="botao-secundario">Limpar</Link>
        )}
      </form>

      <p className="text-sm text-textoFraco">
        {total} registro(s){alvo && <> para <code className="rounded bg-superficie2 px-1.5 py-0.5">{alvo}</code></>}
      </p>

      <div className="space-y-3">
        {registros.length === 0 && (
          <div className="cartao p-8 text-center text-sm text-textoFraco">
            Nenhum registro. Assim que você executar uma ação no painel, ela aparece aqui.
          </div>
        )}

        {registros.map((r, i) => (
          <article
            key={i}
            className={`cartao p-4 ${r.resultado === 'erro' ? 'border-red-900/40' : ''}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`etiqueta ${
                  r.resultado === 'ok' ? 'bg-superficie2 text-texto' : 'bg-red-950/50 text-red-300'
                }`}>
                  {r.resultado === 'ok' ? r.rotulo : `${r.rotulo} — falhou`}
                </span>
                {r.alvoId && (
                  <Link
                    href={r.alvoTipo === 'jogador' ? `/admin/jogadores/${r.alvoId}` : `/admin/auditoria?alvo=${r.alvoId}`}
                    className="font-mono text-xs text-marca hover:underline"
                  >
                    {r.alvoId}
                  </Link>
                )}
              </div>
              <time className="text-xs text-textoFraco">
                {new Date(r.quando).toLocaleString('pt-BR')}
              </time>
            </div>

            <p className="mt-2 text-sm">{r.resumo}</p>
            {r.erro && <p className="mt-1 font-mono text-xs text-red-400">{r.erro}</p>}
            {r.motivo && <p className="mt-1 text-sm italic text-textoFraco">“{r.motivo}”</p>}

            <p className="mt-2 text-xs text-textoFraco">
              por <strong className="text-texto">{r.adminNome}</strong>
              <span className="font-mono"> ({r.adminId})</span>
              {r.ip && <> • {r.ip}</>}
            </p>
          </article>
        ))}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          {pagina > 1 && (
            <Link
              href={`/admin/auditoria?pagina=${pagina - 1}${alvo ? `&alvo=${alvo}` : ''}`}
              className="botao-secundario"
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-textoFraco">Página {pagina} de {paginas}</span>
          {pagina < paginas && (
            <Link
              href={`/admin/auditoria?pagina=${pagina + 1}${alvo ? `&alvo=${alvo}` : ''}`}
              className="botao-secundario"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
