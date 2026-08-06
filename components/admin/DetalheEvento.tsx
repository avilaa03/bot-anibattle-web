'use client';

import { useState } from 'react';
import { chamarAdmin } from './api';
import ModalConfirmacao from './ModalConfirmacao';
import { CRITERIOS, CORES_STATUS, nomeDoTipo, type ItemCatalogo } from './eventosComuns';
import type { Evento, CriterioSelecao } from '@/lib/admin/eventos';

/**
 * Um evento aberto: prêmios, lista de participantes e a distribuição.
 *
 * ## Buscar e adicionar são dois botões
 *
 * Buscar por critério ("todos do nível 10+") pode devolver quatro mil
 * pessoas. Se buscar já adicionasse, um clique errado viraria uma
 * premiação de quatro mil — e premiação não tem desfazer.
 *
 * Então buscar só mostra a contagem, e adicionar é um segundo clique,
 * com o número na frente dos olhos.
 */

interface ResultadoDistribuicao {
  premiados: number;
  jaPremiados: number;
  cartasEntregues: number;
  moedasEntregues: number;
  falhas: { userId: string; motivo: string }[];
}

interface Props {
  evento: Evento;
  itens: ItemCatalogo[];
  onErro: (m: string) => void;
  onAviso: (m: string) => void;
  onMudou: () => void;
  onApagado: () => void;
}

export default function DetalheEvento({
  evento,
  itens,
  onErro,
  onAviso,
  onMudou,
  onApagado
}: Props) {
  const [criterio, setCriterio] = useState<CriterioSelecao>('ids');
  const [ids, setIds] = useState('');
  const [nivelMinimo, setNivelMinimo] = useState(10);
  const [topRanking, setTopRanking] = useState(10);
  const [diasAtivos, setDiasAtivos] = useState(7);
  const [previa, setPrevia] = useState<{ ids: string[]; descricao: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const pendentes = evento.participantes.filter((p) => !p.premiado).length;
  const encerrado = evento.status === 'encerrado';

  async function acao(corpo: Record<string, unknown>, depois?: () => void) {
    setOcupado(true);
    onErro('');
    try {
      await chamarAdmin('/api/admin/eventos', { ...corpo, eventoId: evento.id });
      depois?.();
      onMudou();
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'A operação falhou.');
    } finally {
      setOcupado(false);
    }
  }

  async function buscar() {
    setOcupado(true);
    onErro('');
    setPrevia(null);
    try {
      const d = await chamarAdmin<{ ids: string[]; descricao: string }>('/api/admin/eventos', {
        acao: 'selecionar',
        criterio,
        ids,
        nivelMinimo,
        topRanking,
        diasAtivos
      });
      setPrevia({ ids: d.ids, descricao: d.descricao });
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'A busca falhou.');
    } finally {
      setOcupado(false);
    }
  }

  async function distribuir() {
    setConfirmando(false);
    setOcupado(true);
    onErro('');
    try {
      const d = await chamarAdmin<{ resultado: ResultadoDistribuicao }>('/api/admin/eventos', {
        acao: 'distribuir',
        eventoId: evento.id
      });

      const r = d.resultado;
      let msg = `${r.premiados} jogador(es) premiado(s).`;
      if (r.cartasEntregues > 0) msg += ` ${r.cartasEntregues} carta(s) entregue(s).`;
      if (r.moedasEntregues > 0) msg += ` ${r.moedasEntregues.toLocaleString('pt-BR')} moedas.`;
      if (r.jaPremiados > 0) msg += ` ${r.jaPremiados} já tinham recebido e foram pulados.`;
      onAviso(msg);

      if (r.falhas.length > 0) {
        // Falha aqui é grave e específica: o participante ficou MARCADO
        // como premiado sem receber nada. Precisa aparecer inteiro, com
        // os IDs, para você pagar à mão pela ficha dele.
        onErro(
          `⚠️ ${r.falhas.length} jogador(es) ficaram marcados como premiados mas a entrega falhou — `
            + 'pague à mão pela ficha de cada um: '
            + r.falhas.map((f) => `${f.userId} (${f.motivo})`).join('; ')
        );
      }

      onMudou();
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'A distribuição falhou.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho, prêmios e ações */}
      <div className="rounded-xl border border-borda bg-superficie p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{evento.nome}</h3>
            {evento.descricao && <p className="mt-1 text-sm text-textoFraco">{evento.descricao}</p>}
            <p className="mt-2 text-xs text-textoFraco">
              {nomeDoTipo(evento.tipo)} · criado por {evento.criadoPor}
            </p>
          </div>
          <span className={`rounded px-2 py-1 text-[11px] uppercase ${CORES_STATUS[evento.status]}`}>
            {evento.status}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-borda bg-fundo p-4">
          <h4 className="mb-2 text-sm font-semibold">Prêmio de cada participante</h4>
          <ul className="space-y-1 text-sm text-textoFraco">
            {evento.premios.moedas > 0 && (
              <li>🪙 {evento.premios.moedas.toLocaleString('pt-BR')} moedas</li>
            )}
            {evento.premios.cartas.map((c) => (
              <li key={c.cartaId}>
                🃏 {c.nome} <span className="text-xs">({c.raridade})</span>
                {c.quantidade > 1 && ` ×${c.quantidade}`}
              </li>
            ))}
            {Object.entries(evento.premios.itens).map(([chave, n]) => {
              const item = itens.find((i) => i.chave === chave);
              return (
                <li key={chave}>
                  {item?.emoji ?? '📦'} {item?.nome ?? chave} ×{n}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {pendentes > 0 && !encerrado && (
            <button
              type="button"
              className="botao-primario"
              disabled={ocupado}
              onClick={() => setConfirmando(true)}
            >
              Distribuir para {pendentes} pendente(s)
            </button>
          )}

          {evento.tipo === 'inscricao' && evento.status === 'rascunho' && (
            <button
              type="button"
              className="botao-secundario"
              disabled={ocupado}
              onClick={() => acao({ acao: 'abrir' }, () => onAviso('Inscrições abertas no /evento.'))}
            >
              Abrir inscrições
            </button>
          )}

          {!encerrado && (
            <button
              type="button"
              className="botao-secundario"
              disabled={ocupado}
              onClick={() => acao({ acao: 'encerrar' }, () => onAviso('Evento encerrado.'))}
            >
              Encerrar
            </button>
          )}

          {evento.totalPremiados === 0 && (
            <button
              type="button"
              className="botao-secundario !text-red-400"
              disabled={ocupado}
              onClick={() => acao({ acao: 'apagar' }, onApagado)}
            >
              Apagar
            </button>
          )}
        </div>
      </div>

      {/* Montar a lista */}
      {!encerrado && (
        <div className="rounded-xl border border-borda bg-superficie p-6">
          <h4 className="mb-1 font-semibold">Adicionar participantes</h4>
          <p className="mb-4 text-xs text-textoFraco">
            {evento.tipo === 'inscricao'
              ? 'Este evento recebe inscrições pelo /evento no Discord. Você ainda pode acrescentar gente à mão aqui.'
              : 'Busque primeiro e confira o número antes de adicionar.'}
          </p>

          <div className="flex flex-wrap gap-2">
            {CRITERIOS.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => {
                  setCriterio(c.valor);
                  setPrevia(null);
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  criterio === c.valor
                    ? 'border-primaria bg-superficie2'
                    : 'border-borda hover:bg-superficie2'
                }`}
              >
                {c.nome}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {criterio === 'ids' && (
              <textarea
                value={ids}
                onChange={(e) => setIds(e.target.value)}
                rows={4}
                placeholder="Cole os IDs do Discord — vírgula, espaço ou uma por linha, tanto faz."
                className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 font-mono text-sm"
              />
            )}
            {criterio === 'nivel' && (
              <label className="flex items-center gap-2 text-sm">
                Nível mínimo
                <input
                  type="number"
                  min={1}
                  value={nivelMinimo}
                  onChange={(e) => setNivelMinimo(Number(e.target.value) || 1)}
                  className="w-20 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
                />
              </label>
            )}
            {criterio === 'ranking' && (
              <label className="flex items-center gap-2 text-sm">
                Top
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={topRanking}
                  onChange={(e) => setTopRanking(Number(e.target.value) || 10)}
                  className="w-20 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
                />
                do ranking por elo
              </label>
            )}
            {criterio === 'ativos' && (
              <label className="flex items-center gap-2 text-sm">
                Ativos nos últimos
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={diasAtivos}
                  onChange={(e) => setDiasAtivos(Number(e.target.value) || 7)}
                  className="w-20 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
                />
                dias
              </label>
            )}
            {criterio === 'beta' && (
              <p className="text-sm text-textoFraco">Todos que jogaram durante a beta fechada.</p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="botao-secundario" disabled={ocupado} onClick={buscar}>
              {ocupado ? 'Buscando…' : 'Buscar'}
            </button>

            {previa && (
              <>
                <span className="text-sm text-textoFraco">{previa.descricao}</span>
                {previa.ids.length > 0 && (
                  <button
                    type="button"
                    className="botao-primario"
                    disabled={ocupado}
                    onClick={() =>
                      acao({ acao: 'adicionar', ids: previa.ids }, () => {
                        onAviso(`${previa.ids.length} jogador(es) adicionado(s) à lista.`);
                        setPrevia(null);
                      })
                    }
                  >
                    Adicionar {previa.ids.length}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* A lista */}
      <div className="rounded-xl border border-borda bg-superficie p-6">
        <h4 className="mb-4 font-semibold">
          Participantes ({evento.totalPremiados}/{evento.totalParticipantes} premiados)
        </h4>

        {evento.participantes.length === 0 ? (
          <p className="text-sm text-textoFraco">Ninguém na lista ainda.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-superficie text-left text-xs uppercase text-textoFraco">
                <tr>
                  <th className="py-2">ID</th>
                  <th className="py-2">Situação</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {evento.participantes.map((p) => (
                  <tr key={p.userId} className="border-t border-borda">
                    <td className="py-2 font-mono text-xs">{p.userId}</td>
                    <td className="py-2">
                      {p.premiado ? (
                        <span className="text-emerald-400">✓ premiado</span>
                      ) : (
                        <span className="text-textoFraco">pendente</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {!p.premiado && !encerrado && (
                        <button
                          type="button"
                          className="text-xs text-red-400 hover:underline"
                          disabled={ocupado}
                          onClick={() => acao({ acao: 'remover', userId: p.userId })}
                        >
                          remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalConfirmacao
        aberto={confirmando}
        titulo="Distribuir prêmios"
        descricao={
          `${pendentes} jogador(es) vão receber os prêmios agora. Isso cria cartas e moedas de `
          + 'verdade e não tem desfazer em bloco. Quem já recebeu é pulado automaticamente.'
        }
        textoConfirmacao={evento.nome}
        rotuloConfirmacao="Digite o nome do evento para confirmar"
        exigirMotivo={false}
        ocupado={ocupado}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={distribuir}
      />
    </div>
  );
}
