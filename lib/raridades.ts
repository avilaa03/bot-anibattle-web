/**
 * Metadados de raridade.
 *
 * Espelha `bot_animefight/Commands/utils/embeds.js`. Mudou lá, muda aqui —
 * é o que faz a carta no site parecer a mesma carta do Discord.
 */

export interface MetaRaridade {
  chave: string;
  label: string;
  emoji: string;
  cor: string;
  corTexto: string;
  gradiente: [string, string];
  peso: number;
}

export const RARIDADES: Record<string, MetaRaridade> = {
  common: {
    chave: 'common',
    label: 'Comum',
    emoji: '⚪',
    cor: '#9E9E9E',
    corTexto: '#D6D6D6',
    gradiente: ['#4A5560', '#232A30'],
    peso: 0
  },
  rare: {
    chave: 'rare',
    label: 'Rara',
    emoji: '🔵',
    cor: '#2196F3',
    corTexto: '#BBDEFB',
    gradiente: ['#1565C0', '#0A2B54'],
    peso: 1
  },
  'ultra rare': {
    chave: 'ultra rare',
    label: 'Ultra Rara',
    emoji: '🟣',
    cor: '#AB47BC',
    corTexto: '#E1BEE7',
    gradiente: ['#6A1B9A', '#331046'],
    peso: 2
  },
  legendary: {
    chave: 'legendary',
    label: 'Lendária',
    emoji: '🟠',
    cor: '#FF9800',
    corTexto: '#FFD9A3',
    gradiente: ['#8A4B10', '#331F08'],
    peso: 3
  },
  master: {
    chave: 'master',
    label: 'Mestra',
    emoji: '🌟',
    cor: '#FFD700',
    corTexto: '#FFEDA1',
    gradiente: ['#8A7410', '#332B06'],
    peso: 4
  },
  event: {
    chave: 'event',
    label: 'Evento',
    emoji: '🎗️',
    cor: '#00E5A0',
    corTexto: '#9CFFE0',
    gradiente: ['#0B6A50', '#062B22'],
    // Acima da Mestra: é a mais exclusiva do jogo — não sai de roll nem
    // de caixa, só de distribuição direta.
    peso: 5
  }
};

/**
 * As raridades SORTEÁVEIS.
 *
 * `event` fica de fora de propósito: ela nunca sai de um sorteio, então
 * não deve aparecer em filtro de catálogo público nem em "dar carta
 * aleatória de uma raridade" no painel.
 */
export const ORDEM_RARIDADES = ['common', 'rare', 'ultra rare', 'legendary', 'master'];

/** Todas, incluindo Evento. Para criar carta e para a Pokédex de eventos. */
export const TODAS_AS_RARIDADES = [...ORDEM_RARIDADES, 'event'];

export const RARIDADE_EVENTO = 'event';

export function getRaridade(chave?: string | null): MetaRaridade {
  const k = String(chave || 'common').toLowerCase().trim();
  return RARIDADES[k] ?? RARIDADES.common;
}

/** 42 -> "#0042" — mesma regra do dexNumbers.js do bot. */
export function formatarNumero(numero: number | null, total = 0): string {
  if (numero == null) return '#???';
  const casas = Math.max(3, String(total).length);
  return `#${String(numero).padStart(casas, '0')}`;
}

export function formatarMoedas(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor || 0));
}
