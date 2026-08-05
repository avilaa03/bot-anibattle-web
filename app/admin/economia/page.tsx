import { carregarAnalytics, SEM_DADO } from '@/lib/admin/analytics';
import { listarConfiguracao, projetarMestras, tabelaEmVigor } from '@/lib/admin/configuracao';
import { getRaridade } from '@/lib/raridades';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Economia', robots: { index: false, follow: false } };

const nf = new Intl.NumberFormat('pt-BR');

function moeda(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return SEM_DADO;
  return `${nf.format(Math.round(v))} 🪙`;
}

function pct(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return SEM_DADO;
  return `${v.toFixed(casas)}%`;
}

function horas(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return SEM_DADO;
  if (v < 1) return `${Math.round(v * 60)} min`;
  if (v < 48) return `${v.toFixed(1)} h`;
  return `${(v / 24).toFixed(1)} dias`;
}

/** Barra proporcional simples, sem depender de biblioteca de gráfico. */
function Barra({ valor, maximo, cor = 'bg-indigo-500' }: { valor: number; maximo: number; cor?: string }) {
  const largura = maximo > 0 ? Math.max(2, Math.round((valor / maximo) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-superficie2">
      <div className={`h-full ${cor}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

export default async function PaginaEconomia() {
  const [dados, config] = await Promise.all([
    carregarAnalytics(),
    Promise.resolve(listarConfiguracao())
  ]);

  const { economia, raridades, mercado, itens, aprimoramento, protecoes } = dados;
  const maiorCirculacao = Math.max(...raridades.map((r) => r.emCirculacao), 1);
  const tabela = tabelaEmVigor();

  const projecoes = [10, 25, 50, 100].map((n) => projetarMestras(n, 30, dados.chanceMestra));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Economia</h2>
        <p className="mt-1 text-sm text-textoFraco">
          Os números para calibrar taxas e preços. Onde não há dado, aparece{' '}
          <code className="rounded bg-superficie2 px-1 py-0.5">{SEM_DADO}</code> — nunca zero, que
          faria parecer que a coisa não vale nada quando na verdade ninguém a vendeu.
        </p>
      </div>

      {/* ---------- Resumo ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">💰 Visão geral</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xl font-bold">{nf.format(economia.jogadores)}</div>
            <div className="text-xs text-textoFraco">
              jogadores • {nf.format(economia.jogadoresAtivos7d)} ativos em 7 dias
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">{moeda(economia.moedaEmCirculacao)}</div>
            <div className="text-xs text-textoFraco">
              em circulação • mediana {moeda(economia.saldoMediano)}
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">{moeda(economia.patrimonioEmCartas)}</div>
            <div className="text-xs text-textoFraco">
              patrimônio em {nf.format(economia.cartasEmCirculacao)} cartas
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">{nf.format(economia.anunciosAbertos)}</div>
            <div className="text-xs text-textoFraco">
              anúncios abertos • {moeda(economia.valorAnunciado)}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Drops por raridade ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🎲 Cartas por raridade</h3>
        <p className="mt-1 text-sm text-textoFraco">
          O acervo <strong className="text-texto">não é</strong> a taxa de drop: ele acumula todas as
          taxas que já existiram, e o jogador filtra (ninguém desmancha Mestra). Serve para ver
          tendência e ordem de grandeza, não para auditar o sorteio.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-textoFraco">
              <tr>
                <th className="pb-2">Raridade</th>
                <th className="pb-2">No catálogo</th>
                <th className="pb-2">Em circulação</th>
                <th className="pb-2">Real</th>
                <th className="pb-2">Tabela</th>
                <th className="pb-2">Desvio</th>
                <th className="pb-2">1 a cada</th>
                <th className="pb-2 text-right">Patrimônio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {raridades.map((r) => (
                <tr key={r.raridade}>
                  <td className="py-2.5 font-medium">
                    {getRaridade(r.raridade).emoji} {getRaridade(r.raridade).label}
                  </td>
                  <td className="py-2.5">{nf.format(r.noCatalogo)}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-14">{nf.format(r.emCirculacao)}</span>
                      <div className="w-24">
                        <Barra valor={r.emCirculacao} maximo={maiorCirculacao} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">{pct(r.percentualReal)}</td>
                  <td className="py-2.5 text-textoFraco">{pct(r.percentualTeorico)}</td>
                  <td className="py-2.5">
                    {r.desvio === null ? (
                      SEM_DADO
                    ) : (
                      <span className={r.desvio > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {r.desvio > 0 ? '+' : ''}
                        {r.desvio.toFixed(1)} p.p.
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-textoFraco">
                    {r.umACada ? `${nf.format(r.umACada)} rolls` : SEM_DADO}
                  </td>
                  <td className="py-2.5 text-right">{moeda(r.patrimonio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Mercado global ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🏪 Mercado global</h3>
        <p className="mt-1 text-sm text-textoFraco">
          O que os jogadores realmente estão pedindo, contra o valor de referência da fórmula. A{' '}
          <strong className="text-texto">razão</strong> é a mediana dividida pela referência: acima de
          1 por muito tempo significa que a tabela está barata em relação ao que o jogo pratica — e é
          o sinal para mexer em <code className="rounded bg-superficie2 px-1 py-0.5">VALOR_MULTIPLICADOR</code>.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="text-left text-xs uppercase text-textoFraco">
              <tr>
                <th className="pb-2">Raridade</th>
                <th className="pb-2">Anúncios</th>
                <th className="pb-2">Menor</th>
                <th className="pb-2">Mediana</th>
                <th className="pb-2">Maior</th>
                <th className="pb-2">Referência</th>
                <th className="pb-2 text-right">Razão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {mercado.map((m) => (
                <tr key={m.raridade} className={m.anuncios === 0 ? 'text-textoFraco' : ''}>
                  <td className="py-2.5 font-medium">
                    {getRaridade(m.raridade).emoji} {getRaridade(m.raridade).label}
                  </td>
                  <td className="py-2.5">{m.anuncios || SEM_DADO}</td>
                  <td className="py-2.5">{moeda(m.precoMin)}</td>
                  <td className="py-2.5 font-medium">{moeda(m.precoMediana)}</td>
                  <td className="py-2.5">{moeda(m.precoMax)}</td>
                  <td className="py-2.5 text-textoFraco">{moeda(m.referencia)}</td>
                  <td className="py-2.5 text-right">
                    {m.razao === null ? (
                      SEM_DADO
                    ) : (
                      <span
                        className={
                          m.razao >= 1.5 ? 'text-emerald-400' : m.razao <= 0.6 ? 'text-amber-400' : ''
                        }
                      >
                        {m.razao.toFixed(2)}x
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Itens e aprimoramento ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cartao p-5">
          <h3 className="font-semibold">🎒 Itens em circulação</h3>
          <div className="mt-4 space-y-3">
            {itens.map((i) => (
              <div key={i.chave} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">
                    {i.emoji} {i.nome}
                  </div>
                  <div className="text-xs text-textoFraco">
                    {i.preco === null ? 'não está à venda' : `${nf.format(i.preco)} 🪙 na loja`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{nf.format(i.emCirculacao)}</div>
                  <div className="text-xs text-textoFraco">
                    com {nf.format(i.jogadoresCom)} jogador(es)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cartao p-5">
          <h3 className="font-semibold">⬆️ Aprimoramento</h3>
          {aprimoramento.cartasAprimoradas === 0 ? (
            <p className="mt-4 text-sm text-textoFraco">
              Nenhuma carta aprimorada ainda. {SEM_DADO}
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xl font-bold">{nf.format(aprimoramento.cartasAprimoradas)}</div>
                  <div className="text-xs text-textoFraco">cartas acima de +0</div>
                </div>
                <div>
                  <div className="text-xl font-bold">+{aprimoramento.nivelMaximo}</div>
                  <div className="text-xs text-textoFraco">maior nível do servidor</div>
                </div>
              </div>

              {aprimoramento.recorde && (
                <div className="mt-4 rounded-lg border border-borda bg-superficie2 p-3 text-sm">
                  🏆 <strong>{aprimoramento.recorde.carta} (+{aprimoramento.recorde.nivel})</strong>
                  {' '}— overall {aprimoramento.recorde.overall}, de{' '}
                  <code className="rounded bg-superficie px-1 py-0.5 text-xs">
                    {aprimoramento.recorde.jogador}
                  </code>
                </div>
              )}

              <div className="mt-4 space-y-1.5">
                {aprimoramento.porNivel.map((n) => (
                  <div key={n.nivel} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-textoFraco">+{n.nivel}</span>
                    <div className="flex-1">
                      <Barra
                        valor={n.cartas}
                        maximo={Math.max(...aprimoramento.porNivel.map((x) => x.cartas))}
                        cor="bg-amber-500"
                      />
                    </div>
                    <span className="w-10 text-right">{nf.format(n.cartas)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ---------- Proteção contra azar ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🛡️ Proteção contra azar</h3>
        <p className="mt-1 text-sm text-textoFraco">
          Se ninguém nunca chega perto do limite, a rede é código morto — foi exatamente o caso da
          primeira versão, com 120 rolls. Se muita gente vive no limite, ela virou a regra.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {protecoes.map((p) => (
            <div key={p.campo} className="rounded-lg border border-borda bg-superficie2 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {getRaridade(p.raridade).emoji} {getRaridade(p.raridade).label}
                </span>
                <code className="rounded bg-superficie px-1.5 py-0.5 text-xs">{p.env}</code>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{nf.format(p.limite)}</div>
                  <div className="text-xs text-textoFraco">limite</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{nf.format(p.perto)}</div>
                  <div className="text-xs text-textoFraco">perto (80%+)</div>
                </div>
                <div>
                  <div
                    className={`text-lg font-bold ${p.noLimite > 0 ? 'text-emerald-400' : ''}`}
                  >
                    {nf.format(p.noLimite)}
                  </div>
                  <div className="text-xs text-textoFraco">garantidos</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-textoFraco">
                Maior sequência seca do servidor: <strong className="text-texto">{nf.format(p.maior)}</strong> rolls
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Configuração ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">⚙️ Variáveis de ajuste</h3>
        <p className="mt-1 text-sm text-textoFraco">
          Todas têm padrão embutido, então nada quebra sem elas — e é isso que as torna fáceis de
          esquecer. Mudanças exigem editar o <code className="rounded bg-superficie2 px-1 py-0.5">.env</code>{' '}
          na VPS e reiniciar o serviço.
        </p>

        <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-300">
          ⚠️ Esta tela lê o <code>.env</code> <strong>do site</strong>, não o do bot. Onde os dois
          precisam bater e não batem, o site mostra um número que o Discord não pratica. As linhas
          marcadas como <em>só do site</em> são as que mais sofrem com isso.
        </div>

        <div className="mt-4 space-y-3">
          {config.map((c) => (
            <div key={c.env} className="rounded-lg border border-borda bg-superficie2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-superficie px-1.5 py-0.5 text-xs">{c.env}</code>
                  <span className="text-sm font-medium">{c.rotulo}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.usandoPadrao && (
                    <span className="etiqueta bg-superficie text-textoFraco">usando o padrão</span>
                  )}
                  {c.fonte === 'site' && (
                    <span className="etiqueta bg-amber-950/50 text-amber-300">só do site</span>
                  )}
                  <span className="text-sm font-bold">{c.valorEmVigor}</span>
                </div>
              </div>
              <p className="mt-2 text-sm">{c.efeito}</p>
              <p className="mt-1 text-xs text-textoFraco">{c.quandoMexer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Projeção da Mestra ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🌟 Quando baixar a chance de Mestra</h3>
        <p className="mt-1 text-sm text-textoFraco">
          A sensação de &quot;evento do servidor&quot; não depende da taxa individual, e sim do volume de
          rolls do servidor inteiro. Com{' '}
          <strong className="text-texto">{dados.chanceMestra}%</strong> e 30 rolls por jogador por dia:
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {projecoes.map((p) => (
            <div
              key={p.jogadoresAtivos}
              className={`rounded-lg border p-4 text-center ${
                p.jogadoresAtivos === 50 || p.jogadoresAtivos === 100
                  ? 'border-amber-900/50 bg-amber-950/20'
                  : 'border-borda bg-superficie2'
              }`}
            >
              <div className="text-xs text-textoFraco">{p.jogadoresAtivos} ativos</div>
              <div className="mt-1 text-lg font-bold">{horas(p.horasEntreMestras)}</div>
              <div className="text-xs text-textoFraco">entre Mestras</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-textoFraco">
          Hoje há <strong className="text-texto">{nf.format(economia.jogadoresAtivos7d)}</strong>{' '}
          jogadores ativos. Passando de ~40, uma Mestra por dia deixa de ser evento — é a hora de{' '}
          <code className="rounded bg-superficie2 px-1 py-0.5">CHANCE_MESTRA=0.05</code>.
        </p>
      </section>

      <div className="text-right text-xs text-textoFraco">
        Gerado em {new Date(dados.geradoEm).toLocaleString('pt-BR')}
      </div>

      {/* Tabela de chances em vigor, para conferência rápida. */}
      <details className="cartao p-5">
        <summary className="cursor-pointer font-semibold">Tabela de chances em vigor</summary>
        <div className="mt-4 space-y-2">
          {tabela.map((f) => (
            <div key={f.raridade} className="flex items-center justify-between text-sm">
              <span>
                {getRaridade(f.raridade).emoji} {getRaridade(f.raridade).label}
              </span>
              <span className="text-textoFraco">
                {f.chance.toFixed(2)}% • 1 a cada {f.umACada ? nf.format(f.umACada) : SEM_DADO} rolls
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
