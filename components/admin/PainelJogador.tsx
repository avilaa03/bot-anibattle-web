'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chamarAdmin } from './api';
import ModalConfirmacao from './ModalConfirmacao';
import SeletorCarta, { type CartaEscolhida } from './SeletorCarta';
import { ORDEM_RARIDADES, RARIDADES, formatarMoedas } from '@/lib/raridades';
import { ORDEM_TIERS, TIERS } from '@/lib/vip';
import type { FichaJogador } from '@/lib/admin/jogadores';

/**
 * As ações administrativas sobre um jogador.
 *
 * Regra da tela: nada acontece com um clique só quando o efeito é difícil
 * de desfazer. Ações destrutivas abrem o modal de confirmação; as demais
 * executam direto. O servidor aplica a mesma classificação e não confia
 * nesta — o modal é ergonomia, a trava de verdade está lá.
 */

// Espelha `ehPerigosa` em lib/admin/acoes.ts.
const SEMPRE_PERIGOSAS = new Set([
  'remover_cartas', 'remover_vip', 'limpar_pokedex', 'banir', 'resetar'
]);
const LIMITE_CARTAS = 25;
const LIMITE_MOEDAS = 100_000;

function ehPerigosa(acao: string, params: Record<string, unknown>): boolean {
  if (SEMPRE_PERIGOSAS.has(acao)) return true;
  if (acao === 'dar_cartas' && Number(params.quantidade) > LIMITE_CARTAS) return true;
  if (acao === 'ajustar_moedas' && Math.abs(Number(params.delta)) > LIMITE_MOEDAS) return true;
  return false;
}

interface Pendente {
  acao: string;
  params: Record<string, unknown>;
  titulo: string;
  descricao: string;
}

export default function PainelJogador({ ficha }: { ficha: FichaJogador }) {
  const router = useRouter();

  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);

  // Estado dos formulários
  const [cartaDar, setCartaDar] = useState<CartaEscolhida | null>(null);
  const [escopoDar, setEscopoDar] = useState<'carta' | 'raridade' | 'serie'>('carta');
  const [raridadeDar, setRaridadeDar] = useState('common');
  const [serieDar, setSerieDar] = useState('');
  const [qtdDar, setQtdDar] = useState(1);
  const [comPokedex, setComPokedex] = useState(true);

  const [delta, setDelta] = useState(0);

  const [tierVip, setTierVip] = useState('bronze');
  const [mesesVip, setMesesVip] = useState(1);

  const [escopoDex, setEscopoDex] = useState<'carta' | 'raridade' | 'serie' | 'tudo'>('tudo');
  const [cartaDex, setCartaDex] = useState<CartaEscolhida | null>(null);
  const [raridadeDex, setRaridadeDex] = useState('common');
  const [serieDex, setSerieDex] = useState('');

  const [diasBan, setDiasBan] = useState(0);

  async function enviar(
    acao: string,
    params: Record<string, unknown>,
    confirmacao?: { confirmacao: string; motivo: string }
  ) {
    setOcupado(true);
    setAviso(null);
    try {
      const dados = await chamarAdmin('/api/admin/jogadores', {
        acao,
        alvo: ficha.id,
        params,
        confirmacao: confirmacao?.confirmacao,
        motivo: confirmacao?.motivo
      });
      setAviso({ tipo: 'ok', texto: dados.mensagem || 'Feito.' });
      setPendente(null);
      // Recarrega os dados do servidor para a ficha refletir a mudança.
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  /** Executa direto, ou abre o modal se a ação for perigosa. */
  function acionar(acao: string, params: Record<string, unknown>, titulo: string, descricao: string) {
    if (ehPerigosa(acao, params)) {
      setPendente({ acao, params, titulo, descricao });
      return;
    }
    enviar(acao, params);
  }

  const inventarioDoAlvo = (cartaId: string) =>
    ficha.inventario.filter((c) => c.cartaId === cartaId).length;

  return (
    <div className="space-y-6">
      {aviso && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            aviso.tipo === 'ok'
              ? 'border-green-900/60 bg-green-950/30 text-green-300'
              : 'border-red-900/60 bg-red-950/30 text-red-300'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {/* ---------- Cartas ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🎴 Cartas</h3>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="rotulo">O que entregar</label>
              <select
                value={escopoDar}
                onChange={(e) => setEscopoDar(e.target.value as typeof escopoDar)}
                className="campo mt-1"
              >
                <option value="carta">Uma carta específica</option>
                <option value="raridade">Aleatória de uma raridade</option>
                <option value="serie">Aleatória de uma série</option>
              </select>
            </div>

            {escopoDar === 'carta' && (
              <SeletorCarta valor={cartaDar} onEscolher={setCartaDar} rotulo="Qual carta" />
            )}
            {escopoDar === 'raridade' && (
              <div>
                <label className="rotulo">Raridade</label>
                <select value={raridadeDar} onChange={(e) => setRaridadeDar(e.target.value)} className="campo mt-1">
                  {ORDEM_RARIDADES.map((r) => (
                    <option key={r} value={r}>{RARIDADES[r].label}</option>
                  ))}
                </select>
              </div>
            )}
            {escopoDar === 'serie' && (
              <div>
                <label className="rotulo">Série</label>
                <input value={serieDar} onChange={(e) => setSerieDar(e.target.value)} className="campo mt-1" placeholder="Ex.: Naruto" />
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="w-28">
                <label className="rotulo">Quantidade</label>
                <input
                  type="number" min={1} max={500} value={qtdDar}
                  onChange={(e) => setQtdDar(Math.max(1, Number(e.target.value) || 1))}
                  className="campo mt-1"
                />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-textoFraco">
                <input type="checkbox" checked={comPokedex} onChange={(e) => setComPokedex(e.target.checked)} />
                Registrar na Pokédex
              </label>
            </div>

            {qtdDar > LIMITE_CARTAS && (
              <p className="text-xs text-amber-400">
                Acima de {LIMITE_CARTAS} cartas a operação passa a exigir confirmação e motivo —
                esse volume mexe na economia do jogo.
              </p>
            )}

            <button
              type="button"
              disabled={ocupado || (escopoDar === 'carta' && !cartaDar) || (escopoDar === 'serie' && !serieDar.trim())}
              onClick={() => acionar(
                'dar_cartas',
                {
                  escopo: escopoDar,
                  cartaId: cartaDar?.id,
                  raridade: raridadeDar,
                  serie: serieDar.trim(),
                  quantidade: qtdDar,
                  comPokedex
                },
                'Entregar muitas cartas de uma vez',
                `Você vai dar ${qtdDar} cartas para ${ficha.id}. Volume alto infla a economia — `
                + 'confirme que é um evento ou uma compensação planejada.'
              )}
              className="botao-primario w-full disabled:opacity-40"
            >
              Entregar cartas
            </button>
          </div>

          <div className="rounded-lg border border-borda bg-superficie2/50 p-4 text-sm text-textoFraco">
            <p className="font-medium text-texto">Como funciona</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
              <li>A carta entregue é uma cópia idêntica à que o <code>/roll</code> geraria.</li>
              <li>Se o jogador ainda não tem carta favorita, a primeira vira a favorita.</li>
              <li>Remover cartas depois <strong>não</strong> apaga a Pokédex: descoberta é permanente.</li>
              <li>Para importar muitas cartas ao catálogo, use <code>npm run import:anilist</code> no bot.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- Economia ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🪙 Moedas</h3>
        <p className="mt-1 text-sm text-textoFraco">
          Saldo atual: <strong className="text-texto">{formatarMoedas(ficha.saldo)}</strong>
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="rotulo">Quanto somar (ou subtrair)</label>
            <input
              type="number" value={delta}
              onChange={(e) => setDelta(Number(e.target.value) || 0)}
              className="campo mt-1" placeholder="Ex.: 500 ou -200"
            />
          </div>
          <button
            type="button"
            disabled={ocupado || delta === 0}
            onClick={() => acionar(
              'ajustar_moedas', { delta },
              'Movimentação alta de moedas',
              `Você vai ${delta > 0 ? 'creditar' : 'debitar'} ${formatarMoedas(Math.abs(delta))} moedas. `
              + 'Valores desse tamanho afetam o ranking e a inflação.'
            )}
            className="botao-secundario disabled:opacity-40"
          >
            Aplicar
          </button>
          <p className="text-xs text-textoFraco">
            Novo saldo: <strong className="text-texto">{formatarMoedas(Math.max(0, ficha.saldo + delta))}</strong>
            {ficha.saldo + delta < 0 && ' (trava no zero — o saldo nunca fica negativo)'}
          </p>
        </div>
      </section>

      {/* ---------- VIP ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">⭐ VIP</h3>
        <p className="mt-1 text-sm text-textoFraco">
          {ficha.vip.tier
            ? `Plano ${ficha.vip.nome} — ${ficha.vip.ativo ? 'ativo' : 'expirado'}`
              + (ficha.vip.expiraEm ? `, até ${new Date(ficha.vip.expiraEm).toLocaleDateString('pt-BR')}` : ' (vitalício)')
            : 'Sem plano.'}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="rotulo">Plano</label>
            <select value={tierVip} onChange={(e) => setTierVip(e.target.value)} className="campo mt-1">
              {ORDEM_TIERS.map((t) => (
                <option key={t} value={t}>{TIERS[t].emoji} {TIERS[t].nome} — R$ {TIERS[t].precoBRL}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="rotulo">Meses</label>
            <input
              type="number" min={1} max={120} value={mesesVip}
              onChange={(e) => setMesesVip(Math.max(1, Number(e.target.value) || 1))}
              className="campo mt-1"
            />
          </div>
          <button
            type="button" disabled={ocupado}
            onClick={() => acionar('dar_vip', { tier: tierVip, meses: mesesVip }, '', '')}
            className="botao-primario disabled:opacity-40"
          >
            Ativar / renovar
          </button>
          {ficha.vip.tier && (
            <button
              type="button" disabled={ocupado}
              onClick={() => acionar(
                'remover_vip', {},
                'Cancelar o VIP deste jogador',
                'O plano some na hora e o tempo pago não é devolvido. Se foi estorno ou chargeback, '
                + 'escreva isso no motivo.'
              )}
              className="botao-secundario disabled:opacity-40"
            >
              Remover VIP
            </button>
          )}
        </div>

        <p className="mt-3 text-xs text-textoFraco">
          Renovar antes de expirar acumula o tempo restante em vez de descartá-lo — mesma regra do
          webhook de pagamento.
        </p>
      </section>

      {/* ---------- Pokédex ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">📖 Pokédex</h3>
        <p className="mt-1 text-sm text-textoFraco">
          {ficha.descobertas} de {ficha.totalCatalogo} cartas descobertas
          {ficha.totalCatalogo > 0 && ` (${((ficha.descobertas / ficha.totalCatalogo) * 100).toFixed(1)}%)`}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="rotulo">Marcar como descoberto</label>
            <select
              value={escopoDex}
              onChange={(e) => setEscopoDex(e.target.value as typeof escopoDex)}
              className="campo mt-1"
            >
              <option value="tudo">A Pokédex inteira</option>
              <option value="raridade">Uma raridade</option>
              <option value="serie">Uma série</option>
              <option value="carta">Uma carta</option>
            </select>
          </div>

          {escopoDex === 'raridade' && (
            <div>
              <label className="rotulo">Raridade</label>
              <select value={raridadeDex} onChange={(e) => setRaridadeDex(e.target.value)} className="campo mt-1">
                {ORDEM_RARIDADES.map((r) => <option key={r} value={r}>{RARIDADES[r].label}</option>)}
              </select>
            </div>
          )}
          {escopoDex === 'serie' && (
            <div>
              <label className="rotulo">Série</label>
              <input value={serieDex} onChange={(e) => setSerieDex(e.target.value)} className="campo mt-1" placeholder="Ex.: Naruto" />
            </div>
          )}
          {escopoDex === 'carta' && (
            <div className="sm:col-span-2">
              <SeletorCarta valor={cartaDex} onEscolher={setCartaDex} rotulo="Qual carta" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={ocupado || (escopoDex === 'carta' && !cartaDex) || (escopoDex === 'serie' && !serieDex.trim())}
            onClick={() => acionar('marcar_pokedex', {
              escopo: escopoDex,
              cartaId: cartaDex?.id,
              raridade: raridadeDex,
              serie: serieDex.trim()
            }, '', '')}
            className="botao-primario disabled:opacity-40"
          >
            Marcar como descoberto
          </button>
          <button
            type="button" disabled={ocupado || ficha.descobertas === 0}
            onClick={() => acionar(
              'limpar_pokedex', {},
              'Apagar a Pokédex inteira deste jogador',
              `${ficha.descobertas} descobertas serão apagadas. O estado anterior fica salvo no log `
              + 'de auditoria, que é a única forma de restaurar sem recorrer ao backup.'
            )}
            className="botao-secundario disabled:opacity-40"
          >
            Apagar a Pokédex
          </button>
        </div>

        <p className="mt-3 text-xs text-textoFraco">
          Marcar registra a descoberta <strong>sem entregar a carta</strong> — bom para premiar
          evento sem inflar a economia.
        </p>
      </section>

      {/* ---------- Moderação ---------- */}
      <section className="cartao border-red-900/40 p-5">
        <h3 className="font-semibold">🛡️ Moderação</h3>

        {ficha.banimento ? (
          <div className="mt-3 rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm">
            <p className="font-medium text-red-300">Conta suspensa</p>
            <p className="mt-1 text-textoFraco">Motivo: {ficha.banimento.motivo || '—'}</p>
            <p className="text-textoFraco">
              {ficha.banimento.expiraEm
                ? `Até ${new Date(ficha.banimento.expiraEm).toLocaleString('pt-BR')}`
                : 'Permanente'}
              {ficha.banimento.aplicadoPor && ` • aplicado por ${ficha.banimento.aplicadoPor}`}
            </p>
            <button
              type="button" disabled={ocupado}
              onClick={() => acionar('desbanir', {}, '', '')}
              className="botao-secundario mt-3 disabled:opacity-40"
            >
              Remover banimento
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-44">
              <label className="rotulo">Duração (dias)</label>
              <input
                type="number" min={0} max={3650} value={diasBan}
                onChange={(e) => setDiasBan(Math.max(0, Number(e.target.value) || 0))}
                className="campo mt-1"
              />
              <p className="mt-1 text-xs text-textoFraco">0 = permanente</p>
            </div>
            <button
              type="button" disabled={ocupado}
              onClick={() => acionar(
                'banir', { dias: diasBan },
                'Banir este jogador',
                diasBan > 0
                  ? `A conta fica bloqueada por ${diasBan} dia(s) e volta sozinha depois. `
                  : 'A conta fica bloqueada por tempo indeterminado. '
                  + 'O jogador vê o motivo que você escrever, então escreva algo que faça sentido para ele.'
              )}
              className="botao bg-red-700 text-white hover:bg-red-600 disabled:opacity-40"
            >
              Banir
            </button>
          </div>
        )}

        <div className="mt-6 border-t border-borda pt-4">
          <p className="text-sm font-medium">Resetar a conta</p>
          <p className="mt-1 text-xs leading-relaxed text-textoFraco">
            Apaga inventário, moedas, Pokédex, troféus, missões e estatísticas.
            <strong className="text-texto"> VIP e banimento são preservados</strong> — VIP porque foi
            pago com dinheiro real, banimento para o reset não virar rota de fuga da punição.
          </p>
          <button
            type="button" disabled={ocupado}
            onClick={() => acionar(
              'resetar', {},
              'Resetar a conta deste jogador',
              `${ficha.totalCartas} cartas, ${formatarMoedas(ficha.saldo)} moedas e `
              + `${ficha.descobertas} descobertas serão apagadas. O documento inteiro vai para o log `
              + 'de auditoria antes de ser limpo, o que permite reverter.'
            )}
            className="botao mt-3 bg-red-700 text-white hover:bg-red-600 disabled:opacity-40"
          >
            Resetar conta
          </button>
        </div>
      </section>

      {/* ---------- Inventário ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">📦 Inventário ({ficha.totalCartas})</h3>
        {ficha.inventario.length === 0 ? (
          <p className="mt-3 text-sm text-textoFraco">Sem cartas.</p>
        ) : (
          <>
            {ficha.totalCartas > ficha.inventario.length && (
              <p className="mt-2 text-xs text-textoFraco">
                Mostrando as {ficha.inventario.length} mais recentes de {ficha.totalCartas}.
              </p>
            )}
            <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-borda">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-superficie2 text-left text-xs text-textoFraco">
                  <tr>
                    <th className="px-3 py-2">Carta</th>
                    <th className="px-3 py-2">Raridade</th>
                    <th className="px-3 py-2 text-right">OVR</th>
                    <th className="px-3 py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {ficha.inventario.map((c) => {
                    const meta = RARIDADES[c.raridade];
                    return (
                      <tr key={c.inventoryId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{c.nome}</div>
                          <div className="text-xs text-textoFraco">{c.serie}</div>
                        </td>
                        <td className="px-3 py-2" style={{ color: meta?.cor }}>
                          {meta?.label ?? c.raridade}
                        </td>
                        <td className="px-3 py-2 text-right">{c.overall}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button" disabled={ocupado}
                            onClick={() => acionar(
                              'remover_cartas',
                              { inventoryId: c.inventoryId },
                              `Remover "${c.nome}" do inventário`,
                              `O jogador tem ${inventarioDoAlvo(c.cartaId ?? '')} cópia(s) desta carta. `
                              + 'A Pokédex dele não é afetada.'
                            )}
                            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40"
                          >
                            remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ModalConfirmacao
        aberto={pendente !== null}
        titulo={pendente?.titulo || 'Confirmar operação'}
        descricao={pendente?.descricao || 'Esta operação é difícil de desfazer.'}
        textoConfirmacao={ficha.id}
        rotuloConfirmacao="Digite o ID do jogador para confirmar"
        ocupado={ocupado}
        onCancelar={() => setPendente(null)}
        onConfirmar={(dados) => {
          if (pendente) enviar(pendente.acao, pendente.params, dados);
        }}
      />
    </div>
  );
}
