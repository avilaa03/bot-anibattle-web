/**
 * Catálogo de caixas — espelho de `Commands/utils/boxes.js` do bot.
 *
 * Só o que o site precisa: chave, nome, emoji e se está à venda. A
 * distribuição de raridades e o preço continuam morando no bot, que é
 * quem sorteia — e o preço de lá é DERIVADO do valor esperado das cartas,
 * então copiá-lo aqui seria copiar um número que muda sozinho quando
 * `VALOR_MULTIPLICADOR` muda.
 *
 * ## Por que a chave importa mais do que parece
 *
 * Ela vira caminho de campo no Mongo (`bolsa.caixa_lendaria`) na hora de
 * entregar. Uma chave errada aqui — `lendária` com acento, digamos —
 * viraria um código vendido que falha no resgate, com o dinheiro já no
 * caixa. Por isso `npm run codigos:conferir` compara esta lista com a do
 * bot e reprova se elas divergirem.
 */

export interface Caixa {
  chave: string;
  nome: string;
  emoji: string;
  /** Está à venda por moeda do jogo no `/caixa comprar`? */
  aVenda: boolean;
  ordem: number;
}

export const CAIXAS: Record<string, Caixa> = {
  comum: { chave: 'comum', nome: 'Caixa Comum', emoji: '📦', aVenda: true, ordem: 1 },
  tematica: { chave: 'tematica', nome: 'Caixa Temática', emoji: '🎯', aVenda: true, ordem: 2 },
  elite: { chave: 'elite', nome: 'Caixa Elite', emoji: '💠', aVenda: true, ordem: 3 },
  lendaria: { chave: 'lendaria', nome: 'Caixa Lendária', emoji: '🌟', aVenda: true, ordem: 4 },
  /**
   * Não está à venda por moeda — ela sai de votar no bot. Continua podendo
   * entrar num código de resgate: a validação olha o catálogo, não a
   * vitrine.
   */
  apoiador: { chave: 'apoiador', nome: 'Caixa do Apoiador', emoji: '💝', aVenda: false, ordem: 5 }
};

/** Prefixo da caixa dentro da bolsa do jogador. Igual ao do bot. */
export const PREFIXO_BOLSA = 'caixa_';

export function todasAsCaixas(): Caixa[] {
  return Object.values(CAIXAS).sort((a, b) => a.ordem - b.ordem);
}

export function getCaixa(chave?: string | null): Caixa | null {
  return CAIXAS[String(chave || '').toLowerCase().trim()] ?? null;
}

export function existe(chave?: string | null): boolean {
  return getCaixa(chave) !== null;
}

/** A chave desta caixa dentro da bolsa: `lendaria` -> `caixa_lendaria`. */
export function chaveNaBolsa(chave: string): string {
  return `${PREFIXO_BOLSA}${String(chave).toLowerCase().trim()}`;
}
