import { RARIDADES } from '@/lib/raridades';
import { TIPOS } from '@/lib/conquistas';
import { faixaDoScore, LIMIAR_PONTUAL_MS, LIMIAR_CLIQUE_MS, AMOSTRAS_MINIMAS } from '@/lib/telemetria';
import type { FichaJogador } from '@/lib/admin/jogadores';

/**
 * Os painéis de LEITURA da ficha: bolsa, proteção contra azar, telemetria,
 * conquistas e missões.
 *
 * Separado do `PainelJogador` de propósito. Aquele é um componente de
 * cliente porque precisa de estado de formulário; este não muda nada e
 * não tem interação, então roda no servidor e não custa JavaScript no
 * navegador.
 */

const nf = new Intl.NumberFormat('pt-BR');

function duracao(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)}min`;
  return `${(m / 60).toFixed(1)}h`;
}

/** Histograma de 24 horas em blocos, igual ao do script do bot. */
function Histograma({ horas }: { horas: number[] }) {
  const maximo = Math.max(...horas, 1);

  return (
    <div>
      <div className="flex h-16 items-end gap-[2px]">
        {horas.map((n, h) => (
          <div
            key={h}
            title={`${h}h UTC — ${n} roll(s)`}
            className={`flex-1 rounded-sm ${n === 0 ? 'bg-superficie2' : 'bg-indigo-500'}`}
            style={{ height: n === 0 ? '3px' : `${Math.max(8, (n / maximo) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-textoFraco">
        <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
      </div>
    </div>
  );
}

export default function DiagnosticoJogador({ ficha }: { ficha: FichaJogador }) {
  const t = ficha.telemetria;
  const faixa = faixaDoScore(t.score);

  const diarias = ficha.missoes.filter((m) => m.periodo === 'diaria');
  const semanais = ficha.missoes.filter((m) => m.periodo === 'semanal');
  const obtidas = ficha.conquistasDetalhe.filter((c) => c.desbloqueadaEm);
  const faltando = ficha.conquistasDetalhe.filter((c) => !c.desbloqueadaEm);

  return (
    <div className="space-y-6">
      {/* ---------- Bolsa e proteção ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao p-5">
          <h3 className="font-semibold">🎒 Bolsa</h3>
          {ficha.bolsa.length === 0 ? (
            <p className="mt-3 text-sm text-textoFraco">Nenhum item.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {ficha.bolsa.map((i) => (
                <div key={i.chave} className="flex items-center justify-between text-sm">
                  <span>
                    {i.emoji} {i.nome}
                    {i.desconhecido && (
                      <span className="ml-2 text-xs text-amber-400">
                        (fora do catálogo)
                      </span>
                    )}
                  </span>
                  <span className="font-bold">{nf.format(i.quantidade)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cartao p-5">
          <h3 className="font-semibold">🛡️ Proteção contra azar</h3>
          <p className="mt-1 text-xs text-textoFraco">
            Rolls seguidos sem tirar a raridade ou melhor. No limite, o próximo vem garantido.
          </p>
          <div className="mt-4 space-y-3">
            {ficha.protecoes.map((p) => {
              const meta = RARIDADES[p.raridade];
              const proporcao = Math.min(100, (p.atual / p.limite) * 100);
              return (
                <div key={p.campo}>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: meta?.cor }}>
                      {meta?.emoji} {meta?.label ?? p.raridade}
                    </span>
                    <span className={p.noLimite ? 'font-bold text-emerald-400' : ''}>
                      {nf.format(p.atual)} / {nf.format(p.limite)}
                      {p.noLimite ? ' — garantida!' : ` (faltam ${nf.format(p.faltam)})`}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-superficie2">
                    <div
                      className={`h-full ${p.noLimite ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${proporcao}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ---------- Telemetria ---------- */}
      <section className="cartao p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">📡 Telemetria do /roll</h3>
          <span className={`text-sm font-bold ${faixa.cor}`}>
            {t.score === null ? faixa.rotulo : `${t.score}/100 — ${faixa.rotulo}`}
          </span>
        </div>

        {t.score === null ? (
          <p className="mt-3 rounded-lg border border-borda bg-superficie2 p-3 text-sm text-textoFraco">
            Ainda não há amostras suficientes: são precisos {AMOSTRAS_MINIMAS} rolls medidos, e este
            jogador tem {nf.format(t.amostras)}. Sem essa trava, quem acabou de chegar lideraria a
            lista de suspeitos.
          </p>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-300">
            ⚠️ Score alto <strong>não é prova</strong>. É ordem de revisão. Jogador dedicado pode ser
            pontual e quem trabalha de madrugada tem sono deslocado — mas o sono existe. Antes de
            qualquer punição, prefira o cooldown progressivo silencioso ao banimento.
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-bold">{nf.format(t.totalRolls)}</div>
            <div className="text-xs text-textoFraco">rolls medidos</div>
          </div>
          <div>
            <div className="text-lg font-bold">{duracao(t.mediaAtrasoMs)}</div>
            <div className="text-xs text-textoFraco">atraso médio após o cooldown</div>
          </div>
          <div>
            <div className="text-lg font-bold">{duracao(t.desvioMs)}</div>
            <div className="text-xs text-textoFraco">desvio-padrão do atraso</div>
          </div>
          <div>
            <div className="text-lg font-bold">{(t.taxaPontual * 100).toFixed(0)}%</div>
            <div className="text-xs text-textoFraco">
              rolls em menos de {LIMIAR_PONTUAL_MS / 1000}s
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-2 text-xs text-textoFraco">
              Atividade por hora (UTC) — {t.horasAtivas}/24 horas ativas, maior silêncio de{' '}
              <strong className="text-texto">{t.maiorSilencioHoras}h</strong>
            </div>
            <Histograma horas={t.horas} />
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold">{duracao(t.mediaCliqueMs)}</div>
              <div className="text-xs text-textoFraco">
                clique médio no botão ({nf.format(t.cliques)} amostras)
              </div>
            </div>
            <div>
              <div className="text-lg font-bold">{(t.taxaCliqueRapido * 100).toFixed(0)}%</div>
              <div className="text-xs text-textoFraco">
                cliques em menos de {LIMIAR_CLIQUE_MS}ms
              </div>
            </div>
          </div>
        </div>

        {t.ultimosRolls.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-textoFraco hover:text-texto">
              Últimos {t.ultimosRolls.length} rolls
            </summary>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-borda">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-borda">
                  {[...t.ultimosRolls].reverse().map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 text-textoFraco">
                        {r.em ? new Date(r.em).toLocaleString('pt-BR') : '—'}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right ${
                          r.atrasoMs < LIMIAR_PONTUAL_MS ? 'text-amber-400' : ''
                        }`}
                      >
                        +{duracao(r.atrasoMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* ---------- Missões ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🎯 Missões</h3>
        {ficha.missoes.length === 0 ? (
          <p className="mt-3 text-sm text-textoFraco">
            Nenhuma missão gerada ainda. Elas nascem no primeiro comando do dia.
          </p>
        ) : (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            {[
              { titulo: 'Diárias', lista: diarias },
              { titulo: 'Semanais', lista: semanais }
            ].map(({ titulo, lista }) => (
              <div key={titulo}>
                <div className="mb-2 text-xs uppercase text-textoFraco">{titulo}</div>
                {lista.length === 0 ? (
                  <p className="text-sm text-textoFraco">—</p>
                ) : (
                  <div className="space-y-2.5">
                    {lista.map((m) => {
                      const proporcao = m.alvo > 0 ? Math.min(100, (m.progresso / m.alvo) * 100) : 0;
                      return (
                        <div key={m.chave}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className={m.resgatada ? 'text-textoFraco line-through' : ''}>
                              {m.nome}
                            </span>
                            <span className="shrink-0 text-xs text-textoFraco">
                              {m.progresso}/{m.alvo}
                              {m.resgatada ? ' • resgatada' : m.completa ? ' • pronta!' : ''}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-superficie2">
                            <div
                              className={`h-full ${
                                m.resgatada ? 'bg-superficie' : m.completa ? 'bg-emerald-500' : 'bg-indigo-500'
                              }`}
                              style={{ width: `${proporcao}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Conquistas ---------- */}
      <section className="cartao p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">🏆 Troféus</h3>
          <span className="text-sm text-textoFraco">
            {obtidas.length}/{ficha.conquistasDetalhe.length} • {nf.format(ficha.pontosConquistas)} pts
            • nível {ficha.nivelConquistas}
          </span>
        </div>

        {/* As não obtidas aparecem também: "o que falta para ele platinar?"
            é a pergunta que a lista só das obtidas não responde. */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[...obtidas, ...faltando].map((c) => {
            const tipo = TIPOS[c.tipo];
            const tem = Boolean(c.desbloqueadaEm);
            return (
              <div
                key={c.chave}
                className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                  tem ? 'border-borda bg-superficie2' : 'border-borda/50 opacity-45'
                }`}
              >
                <span className="text-lg leading-none">{tipo?.emoji ?? '🏅'}</span>
                <div className="min-w-0">
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-xs text-textoFraco">{c.descricao}</div>
                  {c.desbloqueadaEm && (
                    <div className="mt-0.5 text-[11px] text-textoFraco/70">
                      {new Date(c.desbloqueadaEm).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
