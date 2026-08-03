'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Confirmação de operação perigosa.
 *
 * Pede duas coisas: redigitar o identificador do alvo e escrever o
 * motivo. Não é burocracia — o erro mais provável num painel assim não é
 * invasão, é banir o jogador errado porque a linha selecionada era a de
 * cima. Redigitar o ID quebra o piloto automático do clique.
 *
 * O motivo vai para o log de auditoria. É o que responde, daqui a três
 * meses, por que aquela conta foi zerada.
 *
 * O servidor revalida as duas coisas. Este componente é conveniência,
 * não segurança: burlá-lo no navegador não adianta nada.
 */

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  /** O texto que a pessoa precisa redigitar (ID do jogador, nome da carta...). */
  textoConfirmacao: string;
  rotuloConfirmacao?: string;
  /** Quando falso, o motivo é opcional. */
  exigirMotivo?: boolean;
  ocupado?: boolean;
  onCancelar: () => void;
  onConfirmar: (dados: { confirmacao: string; motivo: string }) => void;
}

export default function ModalConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmacao,
  rotuloConfirmacao = 'Digite o ID do jogador para confirmar',
  exigirMotivo = true,
  ocupado = false,
  onCancelar,
  onConfirmar
}: Props) {
  const [confirmacao, setConfirmacao] = useState('');
  const [motivo, setMotivo] = useState('');
  const campoRef = useRef<HTMLInputElement>(null);

  // Reabrir o modal precisa começar do zero, senão a confirmação digitada
  // para a ação anterior continuaria válida para a próxima.
  useEffect(() => {
    if (aberto) {
      setConfirmacao('');
      setMotivo('');
      setTimeout(() => campoRef.current?.focus(), 50);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  const confirmacaoOk = confirmacao === textoConfirmacao;
  const motivoOk = !exigirMotivo || motivo.trim().length >= 5;
  const podeConfirmar = confirmacaoOk && motivoOk && !ocupado;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !ocupado) onCancelar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="cartao w-full max-w-lg border-red-900/60 p-6"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-lg font-bold">{titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-textoFraco">{descricao}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-textoFraco">
              {rotuloConfirmacao}
            </label>
            <code className="mt-1 block select-all rounded bg-superficie2 px-2 py-1 text-xs text-texto">
              {textoConfirmacao}
            </code>
            <input
              ref={campoRef}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              disabled={ocupado}
              className="campo mt-2"
              placeholder="Redigite aqui"
              autoComplete="off"
            />
            {confirmacao.length > 0 && !confirmacaoOk && (
              <p className="mt-1 text-xs text-red-400">Ainda não confere.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-textoFraco">
              Motivo {exigirMotivo && <span className="text-red-400">*</span>}
              <span className="ml-1 font-normal">— fica registrado no log de auditoria</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={ocupado}
              rows={3}
              maxLength={300}
              className="campo mt-2 resize-y"
              placeholder="Ex.: exploit no mercado reportado pelo ticket #12"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancelar} disabled={ocupado} className="botao-secundario">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirmar({ confirmacao, motivo: motivo.trim() })}
            disabled={!podeConfirmar}
            className="botao bg-red-700 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ocupado ? 'Executando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
