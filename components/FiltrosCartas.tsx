'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

/**
 * Filtros do catálogo.
 *
 * Guardamos o estado na URL (?raridade=master&busca=gojo) em vez de no
 * componente. Assim o filtro sobrevive ao recarregar, pode ser
 * compartilhado por link e continua funcionando com o botão voltar do
 * navegador — coisas que estado local não dá de graça.
 *
 * É componente de cliente, então NÃO importa `lib/i18n` — os três
 * dicionários somam mais de 100 KB e iriam parar no bundle do navegador.
 * Recebe as strings já traduzidas por prop, inclusive os rótulos de
 * raridade, e o idioma só para montar a URL.
 */

interface Props {
  series: { nome: string; total: number }[];
  idioma: string;
  /** Já formatado no locale certo pelo servidor: 1.234 x 1,234. */
  totalFormatado: string;
  raridades: { chave: string; emoji: string; cor: string; label: string }[];
  textos: {
    buscar_placeholder: string;
    buscar_aria: string;
    buscar: string;
    todas: string;
    todas_series: string;
    filtrar_serie: string;
    ordenar: string;
    ordem_numero: string;
    ordem_overall: string;
    ordem_nome: string;
    limpar: string;
    carregando: string;
    contagem: string;
  };
}

export default function FiltrosCartas({
  series,
  idioma,
  totalFormatado,
  raridades,
  textos
}: Props) {
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
    // O prefixo de idioma é obrigatório: sem ele o middleware redecide o
    // idioma e cada clique em filtro devolve o visitante ao português.
    iniciarTransicao(() => router.push(`/${idioma}/cartas?${novos.toString()}`));
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
          placeholder={textos.buscar_placeholder}
          className="flex-1 rounded-lg border border-borda bg-superficie px-4 py-2.5 text-sm
                     outline-none placeholder:text-textoFraco focus:border-marca"
          aria-label={textos.buscar_aria}
        />
        <button type="submit" className="botao-secundario !py-2.5">
          {textos.buscar}
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
          {textos.todas}
        </button>
        {raridades.map((r) => {
          const ativa = raridadeAtual === r.chave;
          return (
            <button
              key={r.chave}
              onClick={() => atualizar({ raridade: ativa ? null : r.chave })}
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
          aria-label={textos.filtrar_serie}
        >
          <option value="">{textos.todas_series}</option>
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
          aria-label={textos.ordenar}
        >
          <option value="numero">{textos.ordem_numero}</option>
          <option value="overall">{textos.ordem_overall}</option>
          <option value="nome">{textos.ordem_nome}</option>
        </select>

        {temFiltro && (
          <button
            onClick={() => {
              setBusca('');
              atualizar({ raridade: null, serie: null, busca: null });
            }}
            className="text-sm text-textoFraco underline hover:text-texto"
          >
            {textos.limpar}
          </button>
        )}

        <span className="ml-auto text-sm text-textoFraco">
          {pendente ? textos.carregando : textos.contagem.replace('{n}', totalFormatado)}
        </span>
      </div>
    </div>
  );
}
