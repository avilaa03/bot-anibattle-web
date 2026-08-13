'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chamarAdmin } from './api';
import ModalConfirmacao from './ModalConfirmacao';
import { TIERS, ORDEM_TIERS } from '@/lib/vip';
import { todosOsItens } from '@/lib/itens';
import { todasAsCaixas } from '@/lib/caixas';
import { MAXIMO, type TipoRecompensa } from '@/lib/codigos';
import type { CodigoResumo, ResgateResumo } from '@/lib/admin/codigos';

/**
 * Gerador e lista de códigos de resgate.
 *
 * ## O fluxo que esta tela existe para servir
 *
 * Você recebe um PIX, gera um código, manda para o comprador. Ele digita
 * `/redeem` no Discord e recebe. Em nenhum momento ele precisa te passar
 * o ID do Discord — que era o passo em que mais gente errava, pagava, e
 * virava suporte manual.
 *
 * ## Por que o código aparece grande e copiável
 *
 * É a única coisa que sai daqui e vai para outra pessoa. Se você tiver
 * que selecionar com o mouse numa tabela apertada, uma hora manda o
 * código errado — e o comprador tenta resgatar um código que pertence a
 * outra venda.
 */

const ESTADOS: Record<CodigoResumo['estado'], { rotulo: string; classe: string }> = {
  ativo: { rotulo: 'ativo', classe: 'bg-green-950/40 text-green-300' },
  esgotado: { rotulo: 'esgotado', classe: 'bg-superficie2 text-textoFraco' },
  vencido: { rotulo: 'vencido', classe: 'bg-amber-950/40 text-amber-300' },
  cancelado: { rotulo: 'cancelado', classe: 'bg-red-950/40 text-red-300' }
};

const ORIGENS: { valor: string; rotulo: string }[] = [
  { valor: 'painel', rotulo: 'Painel (venda manual por PIX)' },
  { valor: 'mercadopago', rotulo: 'Mercado Pago' },
  { valor: 'evento', rotulo: 'Evento / prêmio' },
  { valor: 'parceria', rotulo: 'Parceria / influenciador' }
];

interface LinhaRecompensa {
  tipo: TipoRecompensa;
  tier: string;
  meses: number;
  quantidade: number;
  chaveItem: string;
  chaveCaixa: string;
  cardId: string;
}

const LINHA_VAZIA: LinhaRecompensa = {
  tipo: 'vip',
  tier: 'ouro',
  meses: 1,
  quantidade: 1,
  chaveItem: 'gema',
  chaveCaixa: 'elite',
  cardId: ''
};

/** Traduz a linha do formulário para o formato que a API espera. */
function paraRecompensa(l: LinhaRecompensa) {
  switch (l.tipo) {
    case 'vip': return { tipo: 'vip', params: { tier: l.tier, meses: l.meses } };
    case 'moedas': return { tipo: 'moedas', params: { quantidade: l.quantidade } };
    case 'item': return { tipo: 'item', params: { chave: l.chaveItem, quantidade: l.quantidade } };
    case 'caixa': return { tipo: 'caixa', params: { chave: l.chaveCaixa, quantidade: l.quantidade } };
    case 'carta': return { tipo: 'carta', params: { cardId: l.cardId.trim(), quantidade: l.quantidade } };
    default: return { tipo: l.tipo, params: {} };
  }
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PainelCodigos({
  codigosIniciais,
  travados
}: {
  codigosIniciais: CodigoResumo[];
  travados: ResgateResumo[];
}) {
  const router = useRouter();

  const [linhas, setLinhas] = useState<LinhaRecompensa[]>([{ ...LINHA_VAZIA }]);
  const [quantos, setQuantos] = useState(1);
  const [usosMaximos, setUsosMaximos] = useState(1);
  const [validadeDias, setValidadeDias] = useState(365);
  const [origem, setOrigem] = useState('painel');
  const [referencia, setReferencia] = useState('');
  const [observacao, setObservacao] = useState('');

  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [gerados, setGerados] = useState<string[]>([]);
  const [paraCancelar, setParaCancelar] = useState<CodigoResumo | null>(null);
  const [resgatesDe, setResgatesDe] = useState<{ codigo: string; lista: ResgateResumo[] } | null>(null);

  const itens = todosOsItens();
  const caixas = todasAsCaixas();

  function atualizar(i: number, campo: keyof LinhaRecompensa, valor: string | number) {
    setLinhas(linhas.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function gerar() {
    setOcupado(true);
    setAviso(null);
    setGerados([]);
    try {
      const dados = await chamarAdmin<{ codigos: string[]; descricao: string }>('/api/admin/codigos', {
        acao: 'criar',
        recompensas: linhas.map(paraRecompensa),
        quantos,
        usosMaximos,
        validadeDias,
        origem,
        referencia: referencia.trim() || null,
        observacao: observacao.trim() || null
      });
      setGerados(dados.codigos);
      setAviso({ tipo: 'ok', texto: `${dados.codigos.length} código(s) gerado(s): ${dados.descricao}` });
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  async function cancelar(motivo: string) {
    if (!paraCancelar) return;
    setOcupado(true);
    try {
      await chamarAdmin('/api/admin/codigos', {
        acao: 'cancelar', codigo: paraCancelar.codigo, motivo
      });
      setAviso({ tipo: 'ok', texto: `${paraCancelar.codigo} cancelado.` });
      setParaCancelar(null);
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  async function reativar(codigo: string) {
    setOcupado(true);
    try {
      await chamarAdmin('/api/admin/codigos', { acao: 'reativar', codigo });
      setAviso({ tipo: 'ok', texto: `${codigo} voltou a valer.` });
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  async function verResgates(codigo: string) {
    try {
      const dados = await chamarAdmin<{ resgates: ResgateResumo[] }>('/api/admin/codigos', {
        acao: 'resgates', codigo
      });
      setResgatesDe({ codigo, lista: dados.resgates });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    }
  }

  return (
    <div className="space-y-6">
      {aviso && (
        <div className={`rounded-lg border p-4 text-sm ${
          aviso.tipo === 'ok'
            ? 'border-green-900/60 bg-green-950/30 text-green-300'
            : 'border-red-900/60 bg-red-950/30 text-red-300'
        }`}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Resgates travados ----------
          Fica no topo de propósito: cada linha aqui é alguém que pagou e
          recebeu só parte. É a única coisa nesta tela que precisa de ação
          sua HOJE. */}
      {travados.length > 0 && (
        <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-5">
          <h3 className="font-semibold text-amber-300">
            ⚠️ {travados.length} resgate(s) não terminaram
          </h3>
          <p className="mt-2 text-sm text-textoFraco">
            A entrega parou no meio. O jogador ficou com o que já saiu e{' '}
            <strong className="text-texto">não consegue tentar de novo sozinho</strong> — se
            conseguisse, receberia em dobro a parte que deu certo. Resolva a causa do erro e
            finalize pelo bot, que reprocessa pulando o que já foi entregue.
          </p>
          <div className="mt-4 space-y-2">
            {travados.map((r) => (
              <div key={`${r.codigo}-${r.userId}`} className="rounded-lg border border-borda bg-fundo p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-xs">{r.codigo}</code>
                  <span className="text-textoFraco">jogador {r.userId}</span>
                  <span className="etiqueta bg-amber-950/40 text-amber-300">{r.estado}</span>
                  <span className="text-xs text-textoFraco">
                    entregues: [{r.entregues.join(', ') || '—'}]
                  </span>
                </div>
                {r.erro && <p className="mt-1 font-mono text-xs text-red-300">{r.erro}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Gerador ---------- */}
      <section className="cartao p-5">
        <h3 className="font-semibold">🎟️ Gerar códigos</h3>
        <p className="mt-1 text-sm text-textoFraco">
          O que você escolher aqui é entregue <strong className="text-texto">de uma vez</strong> quando
          o jogador usar <code className="rounded bg-superficie2 px-1 py-0.5">/redeem</code>.
        </p>

        <div className="mt-4 space-y-3">
          {linhas.map((linha, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-borda bg-fundo p-3">
              <div className="min-w-[130px]">
                <label className="rotulo">Tipo</label>
                <select
                  value={linha.tipo}
                  onChange={(e) => atualizar(i, 'tipo', e.target.value)}
                  className="campo mt-1"
                >
                  <option value="vip">👑 VIP</option>
                  <option value="moedas">🪙 Moedas</option>
                  <option value="caixa">📦 Caixa</option>
                  <option value="item">🎒 Item</option>
                  <option value="carta">🎴 Carta</option>
                </select>
              </div>

              {linha.tipo === 'vip' && (
                <>
                  <div className="min-w-[120px]">
                    <label className="rotulo">Plano</label>
                    <select value={linha.tier} onChange={(e) => atualizar(i, 'tier', e.target.value)} className="campo mt-1">
                      {ORDEM_TIERS.map((c) => (
                        <option key={c} value={c}>{TIERS[c].emoji} {TIERS[c].nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="rotulo">Meses</label>
                    <input type="number" min={1} max={MAXIMO.meses} value={linha.meses}
                      onChange={(e) => atualizar(i, 'meses', Number(e.target.value))} className="campo mt-1" />
                  </div>
                </>
              )}

              {linha.tipo === 'moedas' && (
                <div className="w-40">
                  <label className="rotulo">Quantidade</label>
                  <input type="number" min={1} max={MAXIMO.moedas} value={linha.quantidade}
                    onChange={(e) => atualizar(i, 'quantidade', Number(e.target.value))} className="campo mt-1" />
                </div>
              )}

              {linha.tipo === 'item' && (
                <>
                  <div className="min-w-[170px]">
                    <label className="rotulo">Item</label>
                    <select value={linha.chaveItem} onChange={(e) => atualizar(i, 'chaveItem', e.target.value)} className="campo mt-1">
                      {itens.map((it) => <option key={it.chave} value={it.chave}>{it.emoji} {it.nome}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="rotulo">Qtd.</label>
                    <input type="number" min={1} max={MAXIMO.quantidade} value={linha.quantidade}
                      onChange={(e) => atualizar(i, 'quantidade', Number(e.target.value))} className="campo mt-1" />
                  </div>
                </>
              )}

              {linha.tipo === 'caixa' && (
                <>
                  <div className="min-w-[170px]">
                    <label className="rotulo">Caixa</label>
                    <select value={linha.chaveCaixa} onChange={(e) => atualizar(i, 'chaveCaixa', e.target.value)} className="campo mt-1">
                      {caixas.map((c) => <option key={c.chave} value={c.chave}>{c.emoji} {c.nome}</option>)}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="rotulo">Qtd.</label>
                    <input type="number" min={1} max={MAXIMO.quantidade} value={linha.quantidade}
                      onChange={(e) => atualizar(i, 'quantidade', Number(e.target.value))} className="campo mt-1" />
                  </div>
                </>
              )}

              {linha.tipo === 'carta' && (
                <>
                  <div className="min-w-[260px] flex-1">
                    <label className="rotulo">ID da carta no catálogo</label>
                    <input value={linha.cardId} onChange={(e) => atualizar(i, 'cardId', e.target.value)}
                      className="campo mt-1 font-mono text-xs" placeholder="673359c5a5aca0fd5877e974" />
                  </div>
                  <div className="w-24">
                    <label className="rotulo">Qtd.</label>
                    <input type="number" min={1} max={MAXIMO.quantidade} value={linha.quantidade}
                      onChange={(e) => atualizar(i, 'quantidade', Number(e.target.value))} className="campo mt-1" />
                  </div>
                </>
              )}

              {linhas.length > 1 && (
                <button type="button" onClick={() => setLinhas(linhas.filter((_, idx) => idx !== i))}
                  className="text-xs text-textoFraco hover:text-red-300">remover</button>
              )}
            </div>
          ))}

          <button type="button" onClick={() => setLinhas([...linhas, { ...LINHA_VAZIA }])}
            className="text-sm text-marca hover:underline">
            + adicionar recompensa
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="rotulo">Quantos códigos</label>
            <input type="number" min={1} max={200} value={quantos}
              onChange={(e) => setQuantos(Number(e.target.value))} className="campo mt-1" />
          </div>
          <div>
            <label className="rotulo">
              Usos por código <span className="font-normal">— 1 para venda</span>
            </label>
            <input type="number" min={1} value={usosMaximos}
              onChange={(e) => setUsosMaximos(Number(e.target.value))} className="campo mt-1" />
          </div>
          <div>
            <label className="rotulo">Validade (dias) <span className="font-normal">— 0 = não vence</span></label>
            <input type="number" min={0} value={validadeDias}
              onChange={(e) => setValidadeDias(Number(e.target.value))} className="campo mt-1" />
          </div>
          <div>
            <label className="rotulo">Origem</label>
            <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="campo mt-1">
              {ORIGENS.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo">
              Referência <span className="font-normal">— id do PIX, nome da campanha</span>
            </label>
            <input value={referencia} onChange={(e) => setReferencia(e.target.value)}
              className="campo mt-1" placeholder="pix-2026-08-13-joao" />
          </div>
          <div>
            <label className="rotulo">Observação <span className="font-normal">— só para você</span></label>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)}
              className="campo mt-1" placeholder="venda combinada no servidor de suporte" />
          </div>
        </div>

        <button type="button" onClick={gerar} disabled={ocupado} className="botao-primario mt-5">
          {ocupado ? 'Gerando…' : 'Gerar códigos'}
        </button>
      </section>

      {/* ---------- Recém-gerados ----------
          Separado da tabela porque é o que você vai COPIAR agora. Na
          tabela ele viraria mais uma linha entre cinquenta. */}
      {gerados.length > 0 && (
        <section className="rounded-xl border border-green-900/60 bg-green-950/20 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-green-300">Pronto — mande para o comprador</h3>
            <button type="button"
              onClick={() => navigator.clipboard?.writeText(gerados.join('\n'))}
              className="text-xs text-textoFraco hover:text-texto">copiar todos</button>
          </div>
          <div className="mt-3 space-y-1">
            {gerados.map((c) => (
              <code key={c} className="block select-all font-mono text-lg tracking-wider text-texto">{c}</code>
            ))}
          </div>
          <p className="mt-3 text-sm text-textoFraco">
            Instrução para o comprador: digitar{' '}
            <code className="rounded bg-superficie2 px-1 py-0.5">/redeem code:{gerados[0]}</code>{' '}
            em qualquer servidor com o AniBattle.
          </p>
        </section>
      )}

      {/* ---------- Lista ---------- */}
      <section className="cartao overflow-hidden">
        <h3 className="border-b border-borda p-5 font-semibold">Códigos gerados</h3>

        {codigosIniciais.length === 0 ? (
          <p className="p-5 text-sm text-textoFraco">Nenhum código ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-superficie2 text-left text-xs text-textoFraco">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Entrega</th>
                  <th className="px-4 py-3">Usos</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {codigosIniciais.map((c) => (
                  <tr key={c.codigo}>
                    <td className="px-4 py-3">
                      <code className="select-all font-mono text-xs">{c.codigo}</code>
                      {c.referencia && (
                        <div className="text-xs text-textoFraco">ref: {c.referencia}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-textoFraco">{c.descricao}</td>
                    <td className="px-4 py-3">{c.usos}/{c.usosMaximos}</td>
                    <td className="px-4 py-3">
                      <span className={`etiqueta ${ESTADOS[c.estado].classe}`}>{ESTADOS[c.estado].rotulo}</span>
                    </td>
                    <td className="px-4 py-3 text-textoFraco">{formatarData(c.expiraEm)}</td>
                    <td className="px-4 py-3 text-textoFraco">{c.origem}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        {c.usos > 0 && (
                          <button type="button" onClick={() => verResgates(c.codigo)}
                            className="text-textoFraco hover:text-texto">quem usou</button>
                        )}
                        {c.cancelado ? (
                          <button type="button" onClick={() => reativar(c.codigo)} disabled={ocupado}
                            className="text-textoFraco hover:text-green-300">reativar</button>
                        ) : (
                          <button type="button" onClick={() => setParaCancelar(c)} disabled={ocupado}
                            className="text-textoFraco hover:text-red-300">cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Quem usou ---------- */}
      {resgatesDe && (
        <section className="cartao p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Resgates de <code className="font-mono text-sm">{resgatesDe.codigo}</code></h3>
            <button type="button" onClick={() => setResgatesDe(null)}
              className="text-xs text-textoFraco hover:text-texto">fechar</button>
          </div>
          <div className="mt-3 space-y-2">
            {resgatesDe.lista.map((r) => (
              <div key={r.userId} className="flex flex-wrap items-center gap-3 rounded-lg border border-borda bg-fundo p-3 text-sm">
                <code className="font-mono text-xs">{r.userId}</code>
                <span className={`etiqueta ${r.estado === 'concluido' ? 'bg-green-950/40 text-green-300' : 'bg-amber-950/40 text-amber-300'}`}>
                  {r.estado}
                </span>
                <span className="text-xs text-textoFraco">{formatarData(r.criadoEm)}</span>
                {r.erro && <span className="font-mono text-xs text-red-300">{r.erro}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <ModalConfirmacao
        aberto={paraCancelar !== null}
        titulo={`Cancelar ${paraCancelar?.codigo ?? ''}`}
        descricao={
          `Este código deixa de funcionar imediatamente. Os ${paraCancelar?.usos ?? 0} resgate(s) já `
          + 'feitos NÃO são desfeitos — quem já recebeu continua com tudo. '
          + 'Use isto para estorno ou código enviado por engano.'
        }
        textoConfirmacao={paraCancelar?.codigo ?? ''}
        rotuloConfirmacao="Digite o código para confirmar"
        ocupado={ocupado}
        onCancelar={() => setParaCancelar(null)}
        onConfirmar={({ motivo }) => cancelar(motivo)}
      />
    </div>
  );
}
