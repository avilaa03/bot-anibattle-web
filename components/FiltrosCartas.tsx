'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import { RARIDADES, ORDEM_RARIDADES } from '@/lib/raridades';

/**
 * Filtros do catálogo.
 *
 * Guardamos o estado na URL (?raridade=master&busca=gojo) em vez de no
 * componente. Assim o filtro sobrevive ao recarregar, pode ser
 * compartilhado por link e continua funcionando com o botão voltar do
 * navegador — coisas que estado local não dá de graça.
 */

interface Props {
  series: { nome: string; total: number }[];
  total: number;
}

export default function FiltrosCartas({ series, total }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  const [busca, setBusca] = useState(params.get('busca') ?? '');

  const raridadeAtual = params.get('raridade') ?? '';
  const serieAtual = params.get('serie') ?? '';
  const ordemAtual = params.get('ordem') ?? 'numero';

  function atualizar(mudancas: Record<string, string | null>) {
    const novos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor) novos.set(chave, valor);
      else novos.delete(chave);
    }
    // Qualquer mudança de filtro volta para a primeira página.
    novos.delete('pagina');
    iniciarTransicao(() => router.push(`/cartas?${novos.toString()}`));
  }

  const temFiltro = Boolean(raridadeAtual || serieAtual || params.get('busca'));

  return (
    <div className="space-y-4">
      {/* Busca */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          atualizar({ busca: busca.trim() || null });
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome do personagem..."
          className="flex-1 rounded-lg border border-borda bg-superficie px-4 py-2.5 text-sm
                     outline-none placeholder:text-textoFraco focus:border-marca"
          aria-label="Buscar carta pelo nome"
        />
        <button type="submit" className="botao-secundario !py-2.5">
          Buscar
        </button>
      </form>

      {/* Raridade */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => atualizar({ raridade: null })}
          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            !raridadeAtual
              ? 'border-marca bg-marca/15 text-marca'
              : 'border-borda text-textoFraco hover:text-texto'
          }`}
        >
          Todas
        </button>
        {ORDEM_RARIDADES.map((chave) => {
          const r = RARIDADES[chave];
          const ativa = raridadeAtual === chave;
          return (
            <button
              key={chave}
              onClick={() => atualizar({ raridade: ativa ? null : chave })}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors"
              style={{
                borderColor: ativa ? r.cor : '#262C35',
                background: ativa ? `${r.cor}22` : 'transparent',
                color: ativa ? r.cor : '#9AA3AE'
              }}
            >
              {r.emoji} {r.label}
            </button>
          );
        })}
      </div>

      {/* Série e ordenação */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={serieAtual}
          onChange={(e) => atualizar({ serie: e.target.value || null })}
          className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
          aria-label="Filtrar por série"
        >
          <option value="">Todas as séries</option>
          {series.map((s) => (
            <option key={s.nome} value={s.nome}>
              {s.nome} ({s.total})
            </option>
          ))}
        </select>

        <select
          value={ordemAtual}
          onChange={(e) => atualizar({ ordem: e.target.value })}
          className="rounded-lg border border-borda bg-superficie px-3 py-2 text-sm outline-none focus:border-marca"
          aria-label="Ordenar"
        >
          <option value="numero">Ordem da Pokédex</option>
          <option value="overall">Melhor overall</option>
          <option value="nome">Nome (A-Z)</option>
        </select>

        {temFiltro && (
          <button
            onClick={() => {
              setBusca('');
              atualizar({ raridade: null, serie: null, busca: null });
            }}
            className="text-sm text-textoFraco underline hover:text-texto"
          >
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-sm text-textoFraco">
          {pendente ? 'Carregando...' : `${new Intl.NumberFormat('pt-BR').format(total)} carta(s)`}
        </span>
      </div>
    </div>
  );
}
