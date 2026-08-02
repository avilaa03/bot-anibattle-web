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
  }
};

export const ORDEM_RARIDADES = ['common', 'rare', 'ultra rare', 'legendary', 'master'];

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
