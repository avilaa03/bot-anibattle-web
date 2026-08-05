import Link from 'next/link';
import { buscarFicha } from '@/lib/admin/jogadores';
import { ultimasAcoesDoAlvo } from '@/lib/admin/auditoria';
import PainelJogador from '@/components/admin/PainelJogador';
import DiagnosticoJogador from '@/components/admin/DiagnosticoJogador';
import { formatarMoedas } from '@/lib/raridades';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ficha do jogador', robots: { index: false, follow: false } };

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="cartao p-4">
      <div className="text-xl font-bold">{valor}</div>
      <div className="mt-0.5 text-xs text-textoFraco">{rotulo}</div>
      {detalhe && <div className="mt-1 text-[11px] text-textoFraco/70">{detalhe}</div>}
    </div>
  );
}

export default async function FichaDoJogador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await buscarFicha(id);

  if (!ficha) {
    return (
      <div className="cartao p-8 text-center">
        <div className="text-4xl">🔍</div>
        <h2 className="mt-4 text-lg font-semibold">Jogador não encontrado</h2>
        <p className="mt-2 text-sm text-textoFraco">
          Nenhuma conta com o ID <code className="rounded bg-superficie2 px-1.5 py-0.5">{id}</code>.
          O jogador precisa ter usado o bot pelo menos uma vez para existir no banco.
        </p>
        <Link href="/admin/jogadores" className="botao-secundario mt-6">Voltar à busca</Link>
      </div>
    );
  }

  const historico = await ultimasAcoesDoAlvo(ficha.id, 8);
  const totalPartidas = ficha.vitorias + ficha.derrotas;
  const aproveitamento = totalPartidas > 0 ? (ficha.vitorias / totalPartidas) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/jogadores" className="text-xs text-textoFraco hover:text-texto">
            ← Jogadores
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold">{ficha.id}</h2>
            {ficha.staff && (
              <span className="etiqueta bg-indigo-950/50 text-indigo-300">🛡️ Staff</span>
            )}
            {ficha.beta && (
              <span className="etiqueta bg-emerald-950/50 text-emerald-300">🧪 Beta</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ficha.telemetria.score !== null && ficha.telemetria.score >= 40 && (
            <span
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                ficha.telemetria.score >= 70
                  ? 'border-red-900/60 bg-red-950/40 text-red-300'
                  : 'border-amber-900/60 bg-amber-950/40 text-amber-300'
              }`}
            >
              📡 Telemetria {ficha.telemetria.score}/100
            </span>
          )}
          {ficha.banimento && (
            <span className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-sm text-red-300">
              🚫 Conta suspensa
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Numero rotulo="Moedas" valor={formatarMoedas(ficha.saldo)} />
        <Numero rotulo="Cartas no inventário" valor={String(ficha.totalCartas)} />
        <Numero
          rotulo="Pokédex"
          valor={`${ficha.descobertas}/${ficha.totalCatalogo}`}
          detalhe={ficha.totalCatalogo > 0 ? `${((ficha.descobertas / ficha.totalCatalogo) * 100).toFixed(1)}% completa` : undefined}
        />
        <Numero
          rotulo="ELO"
          valor={String(ficha.elo)}
          detalhe={`pico ${ficha.picoElo}`}
        />
        <Numero
          rotulo="Batalhas"
          valor={`${ficha.vitorias}V / ${ficha.derrotas}D`}
          detalhe={totalPartidas > 0 ? `${aproveitamento.toFixed(0)}% de vitórias` : 'nenhuma ainda'}
        />
        <Numero
          rotulo="Troféus"
          valor={`${ficha.totalConquistas}/${ficha.conquistasDetalhe.length}`}
          detalhe={`${ficha.pontosConquistas} pts • nível ${ficha.nivelConquistas}`}
        />
        <Numero
          rotulo="Rolls"
          valor={String(ficha.rolls)}
          detalhe={ficha.cartasAprimoradas > 0 ? `${ficha.cartasAprimoradas} carta(s) aprimorada(s)` : undefined}
        />
        <Numero
          rotulo="Sequência do daily"
          valor={String(ficha.streak.atual)}
          detalhe={`maior: ${ficha.streak.maior}`}
        />
        <Numero
          rotulo="VIP"
          valor={ficha.vip.nome ?? '—'}
          detalhe={
            ficha.vip.tier
              ? ficha.vip.ativo
                ? ficha.vip.expiraEm
                  ? `até ${new Date(ficha.vip.expiraEm).toLocaleDateString('pt-BR')}`
                  : 'vitalício'
                : 'expirado'
              : undefined
          }
        />
      </div>

      <DiagnosticoJogador ficha={ficha} />

      <PainelJogador ficha={ficha} />

      {/* ---------- Histórico ---------- */}
      <section className="cartao p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">📋 Últimas ações administrativas</h3>
          <Link href={`/admin/auditoria?alvo=${ficha.id}`} className="text-xs text-marca hover:underline">
            ver tudo
          </Link>
        </div>

        {historico.length === 0 ? (
          <p className="mt-3 text-sm text-textoFraco">Nenhuma ação registrada sobre este jogador.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {historico.map((r, i) => (
              <li key={i} className="border-l-2 border-borda pl-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className={r.resultado === 'ok' ? 'font-medium' : 'font-medium text-red-400'}>
                    {r.rotulo}
                  </span>
                  <span className="text-xs text-textoFraco">
                    por {r.adminNome} • {new Date(r.quando).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-textoFraco">{r.resumo}</p>
                {r.motivo && <p className="mt-0.5 text-xs italic text-textoFraco/80">“{r.motivo}”</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
