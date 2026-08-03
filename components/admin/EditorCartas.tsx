'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chamarAdmin } from './api';
import ModalConfirmacao from './ModalConfirmacao';
import SeletorCarta, { type CartaEscolhida } from './SeletorCarta';
import { ORDEM_RARIDADES, RARIDADES } from '@/lib/raridades';

/**
 * Cadastro e edição de cartas do catálogo.
 *
 * Complementa os scripts do bot em vez de substituí-los: importar 500
 * cartas continua sendo trabalho do `npm run import:anilist`. Aqui é o
 * caso avulso — cadastrar uma carta nova, corrigir um atributo digitado
 * errado, trocar uma imagem que quebrou.
 *
 * As faixas sugeridas por raridade vêm de seedCards.js. Sair delas gera
 * aviso, não erro: uma carta de evento pode ser atípica de propósito.
 */

const FAIXAS: Record<string, { overall: [number, number]; ATA: [number, number]; LIF: [number, number]; POW: [number, number] }> = {
  common: { overall: [30, 55], ATA: [20, 50], LIF: [60, 100], POW: [20, 50] },
  rare: { overall: [50, 65], ATA: [45, 65], LIF: [90, 130], POW: [45, 65] },
  'ultra rare': { overall: [62, 78], ATA: [60, 80], LIF: [120, 160], POW: [60, 80] },
  legendary: { overall: [75, 90], ATA: [75, 95], LIF: [150, 190], POW: [75, 95] },
  master: { overall: [88, 99], ATA: [90, 99], LIF: [180, 220], POW: [90, 99] }
};

interface CartaCompleta {
  id: string;
  numero: number | null;
  name: string;
  series: string;
  characterImage: string;
  seriesImage: string;
  baseImage: string;
  rarity: string;
  overall: number;
  ATA: number;
  LIF: number;
  POW: number;
}

const VAZIA: CartaCompleta = {
  id: '', numero: null, name: '', series: '', characterImage: '', seriesImage: '', baseImage: '',
  rarity: 'common', overall: 40, ATA: 35, LIF: 80, POW: 35
};

export default function EditorCartas() {
  const router = useRouter();

  const [form, setForm] = useState<CartaCompleta>({ ...VAZIA });
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [avisosServidor, setAvisosServidor] = useState<string[]>([]);
  const [paraApagar, setParaApagar] = useState<CartaCompleta | null>(null);
  const [buscada, setBuscada] = useState<CartaEscolhida | null>(null);

  const editando = Boolean(form.id);
  const faixa = FAIXAS[form.rarity];

  async function abrirParaEdicao(escolhida: CartaEscolhida | null) {
    setBuscada(escolhida);
    if (!escolhida) return;

    // Buscamos o documento completo: o seletor devolve só o resumo, e
    // salvar com os campos de imagem vazios apagaria as imagens da carta.
    setOcupado(true);
    try {
      const dados = await chamarAdmin<{ carta: CartaCompleta }>('/api/admin/cartas/detalhe', {
        id: escolhida.id
      });
      setForm(dados.carta);
      setAviso(null);
      setAvisosServidor([]);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  function novo() {
    setForm({ ...VAZIA });
    setBuscada(null);
    setAviso(null);
    setAvisosServidor([]);
  }

  /** Preenche os atributos com o meio da faixa da raridade escolhida. */
  function sugerirAtributos(rarity: string) {
    const f = FAIXAS[rarity];
    if (!f) return;
    const meio = ([a, b]: [number, number]) => Math.round((a + b) / 2);
    setForm((atual) => ({
      ...atual,
      rarity,
      overall: meio(f.overall), ATA: meio(f.ATA), LIF: meio(f.LIF), POW: meio(f.POW)
    }));
  }

  async function salvar() {
    setOcupado(true);
    setAviso(null);
    setAvisosServidor([]);
    try {
      const dados = await chamarAdmin<{ avisos: string[] }>('/api/admin/cartas', {
        operacao: 'salvar', ...form, id: form.id || undefined
      });
      setAviso({ tipo: 'ok', texto: dados.mensagem || 'Salvo.' });
      setAvisosServidor(dados.avisos || []);
      if (!editando) novo();
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(confirmacao: string, motivo: string) {
    if (!paraApagar) return;
    setOcupado(true);
    try {
      const dados = await chamarAdmin('/api/admin/cartas', {
        operacao: 'apagar', id: paraApagar.id, confirmacao, motivo
      });
      setAviso({ tipo: 'ok', texto: dados.mensagem || 'Apagada.' });
      setParaApagar(null);
      novo();
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  const foraDaFaixa = (campo: 'overall' | 'ATA' | 'LIF' | 'POW') => {
    if (!faixa) return false;
    const [min, max] = faixa[campo];
    return form[campo] < min || form[campo] > max;
  };

  const campoNumero = (campo: 'overall' | 'ATA' | 'LIF' | 'POW', rotulo: string) => (
    <div>
      <label className="rotulo">
        {rotulo}
        {faixa && <span className="ml-1 font-normal">({faixa[campo][0]}–{faixa[campo][1]})</span>}
      </label>
      <input
        type="number" value={form[campo]}
        onChange={(e) => setForm({ ...form, [campo]: Number(e.target.value) || 0 })}
        className={`campo mt-1 ${foraDaFaixa(campo) ? 'border-amber-700' : ''}`}
      />
    </div>
  );

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

      {avisosServidor.length > 0 && (
        <ul className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-300">
          {avisosServidor.map((a, i) => <li key={i}>⚠️ {a}</li>)}
        </ul>
      )}

      <section className="cartao p-5">
        <h3 className="font-semibold">🔎 Editar uma carta existente</h3>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-72 flex-1">
            <SeletorCarta valor={buscada} onEscolher={abrirParaEdicao} rotulo="Procurar no catálogo" />
          </div>
          {editando && (
            <button type="button" onClick={novo} className="botao-secundario">Nova carta</button>
          )}
        </div>
      </section>

      <section className="cartao p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">
            {editando ? `✏️ Editando #${String(form.numero ?? 0).padStart(3, '0')}` : '➕ Nova carta'}
          </h3>
          {editando && (
            <button type="button" onClick={() => setParaApagar(form)} className="text-xs text-red-400 hover:underline">
              apagar do catálogo
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="rotulo">Nome do personagem</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="campo mt-1" maxLength={120} />
          </div>
          <div>
            <label className="rotulo">Série</label>
            <input value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} className="campo mt-1" maxLength={120} />
          </div>

          <div className="lg:col-span-2">
            <label className="rotulo">Imagem do personagem (URL)</label>
            <input
              value={form.characterImage}
              onChange={(e) => setForm({ ...form, characterImage: e.target.value })}
              className="campo mt-1" placeholder="https://..."
            />
          </div>
          <div>
            <label className="rotulo">Imagem da série (opcional)</label>
            <input value={form.seriesImage} onChange={(e) => setForm({ ...form, seriesImage: e.target.value })} className="campo mt-1" placeholder="https://..." />
          </div>
          <div>
            <label className="rotulo">Imagem de fundo (opcional)</label>
            <input value={form.baseImage} onChange={(e) => setForm({ ...form, baseImage: e.target.value })} className="campo mt-1" placeholder="https://..." />
          </div>

          <div>
            <label className="rotulo">Raridade</label>
            <select
              value={form.rarity}
              onChange={(e) => sugerirAtributos(e.target.value)}
              className="campo mt-1"
            >
              {ORDEM_RARIDADES.map((r) => (
                <option key={r} value={r}>{RARIDADES[r].label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-textoFraco">
              Trocar a raridade preenche os atributos com o meio da faixa.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          {campoNumero('overall', 'Overall')}
          {campoNumero('ATA', 'ATA')}
          {campoNumero('LIF', 'LIF')}
          {campoNumero('POW', 'POW')}
        </div>

        {form.characterImage && (
          <div className="mt-4">
            <p className="rotulo">Pré-visualização</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.characterImage} alt=""
              className="mt-1 h-40 w-32 rounded-lg border border-borda object-cover"
            />
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button" onClick={salvar}
            disabled={ocupado || !form.name.trim() || !form.series.trim() || !form.characterImage.trim()}
            className="botao-primario disabled:opacity-40"
          >
            {ocupado ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar carta'}
          </button>
          {!editando && (
            <p className="text-xs text-textoFraco">
              O número da Pokédex é atribuído automaticamente e nunca muda depois.
            </p>
          )}
        </div>
      </section>

      <ModalConfirmacao
        aberto={paraApagar !== null}
        titulo="Apagar esta carta do catálogo"
        descricao={
          `"${paraApagar?.name ?? ''}" some do catálogo e do site. Quem já tem a carta continua com `
          + 'ela no inventário, mas o registro na Pokédex fica órfão. O número dela não é reaproveitado.'
        }
        textoConfirmacao={paraApagar?.name ?? ''}
        rotuloConfirmacao="Digite o nome da carta para confirmar"
        ocupado={ocupado}
        onCancelar={() => setParaApagar(null)}
        onConfirmar={({ confirmacao, motivo }) => apagar(confirmacao, motivo)}
      />
    </div>
  );
}
