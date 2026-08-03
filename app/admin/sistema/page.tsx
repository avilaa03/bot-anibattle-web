import { estadoDoBot, diagnosticarBanco, TOLERANCIA_MS } from '@/lib/admin/sistema';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sistema', robots: { index: false, follow: false } };

function tempoRelativo(iso: string | null): string {
  if (!iso) return '—';
  const segundos = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (segundos < 60) return `há ${segundos}s`;
  if (segundos < 3600) return `há ${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.round(segundos / 3600)} h`;
  return `há ${Math.round(segundos / 86400)} dia(s)`;
}

function duracao(desde: string | null): string {
  if (!desde) return '—';
  const s = Math.round((Date.now() - new Date(desde).getTime()) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default async function PaginaSistema() {
  const [bot, banco] = await Promise.all([estadoDoBot(), diagnosticarBanco()]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Sistema</h2>
        <p className="mt-1 text-sm text-textoFraco">
          O mesmo que o <code className="rounded bg-superficie2 px-1 py-0.5">npm run check:db</code> do
          bot mostra no terminal, mais o estado do próprio bot.
        </p>
      </div>

      {/* ---------- Bot ---------- */}
      <section className="cartao p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">🤖 Bot</h3>
          <span
            className={`etiqueta ${
              bot.online ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'
            }`}
          >
            {bot.online ? '● online' : '● offline'}
          </span>
        </div>

        {!bot.configurado ? (
          <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-300">
            O bot ainda não publicou nenhum sinal de vida. Isso é esperado se ele não foi reiniciado
            desde que o módulo de presença entrou. Reinicie o bot e recarregue esta página.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-xl font-bold">{bot.totalServidores}</div>
                <div className="text-xs text-textoFraco">servidores</div>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR').format(bot.totalMembros)}
                </div>
                <div className="text-xs text-textoFraco">membros alcançados</div>
              </div>
              <div>
                <div className="text-xl font-bold">{duracao(bot.iniciadoEm)}</div>
                <div className="text-xs text-textoFraco">no ar sem reiniciar</div>
              </div>
              <div>
                <div className="text-xl font-bold">{tempoRelativo(bot.atualizadoEm)}</div>
                <div className="text-xs text-textoFraco">último sinal de vida</div>
              </div>
            </div>

            <p className="mt-4 text-xs text-textoFraco">
              {bot.tag && <>Conectado como <strong className="text-texto">{bot.tag}</strong> • </>}
              {bot.versaoNode && <>Node {bot.versaoNode} • </>}
              o bot publica o estado a cada minuto; sem sinal por{' '}
              {Math.round(TOLERANCIA_MS / 60000)} minutos ele é considerado offline.
            </p>

            {!bot.online && bot.desligadoEm && (
              <p className="mt-2 text-xs text-textoFraco">
                Último encerramento limpo: {new Date(bot.desligadoEm).toLocaleString('pt-BR')} —
                ou seja, ele foi desligado de propósito, não caiu.
              </p>
            )}
          </>
        )}
      </section>

      {/* ---------- Servidores ---------- */}
      {bot.servidores.length > 0 && (
        <section className="cartao overflow-hidden">
          <h3 className="border-b border-borda px-5 py-4 font-semibold">
            🏠 Servidores conectados ({bot.servidores.length})
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-superficie2 text-left text-xs text-textoFraco">
                <tr>
                  <th className="px-5 py-2">Servidor</th>
                  <th className="px-5 py-2 text-right">Membros</th>
                  <th className="px-5 py-2">Bot entrou em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {bot.servidores.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        {s.icone && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://cdn.discordapp.com/icons/${s.id}/${s.icone}.png?size=32`}
                            alt="" width={24} height={24} className="rounded-full"
                          />
                        )}
                        <div>
                          <div>{s.nome}</div>
                          <div className="font-mono text-[11px] text-textoFraco">{s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {new Intl.NumberFormat('pt-BR').format(s.membros)}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-textoFraco">
                      {s.entrouEm ? new Date(s.entrouEm).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Banco ---------- */}
      <section className="cartao p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">🗄️ Banco de dados</h3>
          <span className={`etiqueta ${banco.ok ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'}`}>
            {banco.ok ? `● ${banco.latenciaMs} ms` : '● sem conexão'}
          </span>
        </div>

        {!banco.ok ? (
          <div className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            <p className="font-medium">Não foi possível conectar.</p>
            <p className="mt-1 font-mono text-xs">{banco.erro}</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-textoFraco">
              Conectado ao banco <strong className="text-texto">{banco.banco}</strong>
            </p>

            {banco.avisos.length > 0 && (
              <ul className="mt-4 space-y-2 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-300">
                {banco.avisos.map((a, i) => <li key={i}>⚠️ {a}</li>)}
              </ul>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {banco.colecoes.map((c) => (
                <div key={c.nome} className="flex items-baseline justify-between rounded-lg bg-superficie2 px-3 py-2">
                  <span className="font-mono text-xs">{c.nome}</span>
                  <span className="text-sm font-medium">
                    {c.documentos < 0 ? '—' : new Intl.NumberFormat('pt-BR').format(c.documentos)}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-textoFraco">
              As contagens são estimadas (usam os metadados da coleção), então são instantâneas
              mesmo com milhões de documentos e podem ficar levemente defasadas.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
