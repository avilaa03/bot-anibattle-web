'use client';

import { useEffect, useRef, useState } from 'react';
import { chamarAdmin } from './api';
import { RARIDADES } from '@/lib/raridades';

/**
 * Busca uma carta do catálogo e devolve o id escolhido.
 *
 * Existe para evitar o problema que o script de terminal tem: lá você
 * escreve `--carta "Kirito"` e, se houver três Kiritos, ele escolhe um
 * por você. Aqui a escolha é explícita, com número, série e raridade à
 * vista — não dá para entregar a carta errada sem ver.
 */

export interface CartaEscolhida {
  id: string;
  numero: number | null;
  nome: string;
  serie: string;
  raridade: string;
  overall: number;
}

interface Props {
  valor: CartaEscolhida | null;
  onEscolher: (carta: CartaEscolhida | null) => void;
  rotulo?: string;
}

export default function SeletorCarta({ valor, onEscolher, rotulo = 'Carta' }: Props) {
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState<CartaEscolhida[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Espera a digitação parar antes de consultar: sem isso seria uma
  // requisição por tecla pressionada.
  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(async () => {
      setBuscando(true);
      setErro('');
      try {
        const dados = await chamarAdmin<{ cartas: CartaEscolhida[] }>('/api/admin/buscar', { termo });
        setResultados(dados.cartas);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha na busca.');
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [termo, aberto]);

  // Clique fora fecha a lista.
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, []);

  if (valor) {
    const meta = RARIDADES[valor.raridade];
    return (
      <div>
        <label className="rotulo">{rotulo}</label>
        <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-borda bg-superficie2 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {valor.numero != null && (
                <span className="text-textoFraco">#{String(valor.numero).padStart(3, '0')} </span>
              )}
              {valor.nome}
            </div>
            <div className="truncate text-xs text-textoFraco">
              {valor.serie} • <span style={{ color: meta?.cor }}>{meta?.label ?? valor.raridade}</span> • OVR {valor.overall}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onEscolher(null); setTermo(''); setAberto(false); }}
            className="shrink-0 text-xs text-textoFraco hover:text-texto"
          >
            trocar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="rotulo">{rotulo}</label>
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        onFocus={() => setAberto(true)}
        className="campo mt-1"
        placeholder="Digite o nome do personagem ou da série"
        autoComplete="off"
      />

      {aberto && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-borda bg-superficie shadow-xl">
          {buscando && <p className="px-3 py-3 text-xs text-textoFraco">Procurando...</p>}
          {erro && <p className="px-3 py-3 text-xs text-red-400">{erro}</p>}
          {!buscando && !erro && resultados.length === 0 && (
            <p className="px-3 py-3 text-xs text-textoFraco">Nenhuma carta encontrada.</p>
          )}
          {resultados.map((c) => {
            const meta = RARIDADES[c.raridade];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { onEscolher(c); setAberto(false); }}
                className="block w-full border-b border-borda px-3 py-2 text-left last:border-0 hover:bg-superficie2"
              >
                <div className="text-sm">
                  {c.numero != null && (
                    <span className="text-textoFraco">#{String(c.numero).padStart(3, '0')} </span>
                  )}
                  {c.nome}
                </div>
                <div className="text-xs text-textoFraco">
                  {c.serie} • <span style={{ color: meta?.cor }}>{meta?.label ?? c.raridade}</span> • OVR {c.overall}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
