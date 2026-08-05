/**
 * Quanto vale uma carta.
 *
 * Espelha `bot_animefight/Commands/utils/valores.js`. Mudou lá, muda aqui
 * — do mesmo jeito que `raridades.ts` espelha o `embeds.js`.
 *
 * ## Por que este arquivo existe
 *
 * A fórmula antiga era `overall * 10`, com venda rápida pela metade, e a
 * raridade não entrava na conta: dez Comuns do fundo do balde valiam mais
 * que a carta mais rara do jogo. O bot corrigiu isso, o site não veio
 * junto, e as duas telas passaram a discordar sobre o preço da mesma
 * carta — o catálogo mostrava 950 para uma Mestra que no Discord vale
 * 190.500.
 *
 * Pior que a tela: `lib/admin/acoes.ts` usava a mesma conta para montar a
 * cópia que vai para o inventário. O preço fica GRAVADO na carta, então
 * cada "dar cartas" pelo painel criava acervo com a tabela velha.
 *
 * ## A ideia da fórmula
 *
 * A RARIDADE define a ordem de grandeza; o overall só move dentro da
 * faixa daquela raridade (fator de 0,7 a 1,3). Uma Comum excelente
 * continua sendo uma Comum e nunca chega perto de uma Mestra ruim.
 *
 * A venda rápida paga proporcionalmente MENOS conforme a raridade sobe,
 * de propósito: ela cria moeda do nada, e carta rara tem que ir para o
 * mercado de jogadores, onde a moeda troca de mãos e ainda paga taxa.
 */

const RARIDADE_PADRAO = 'common';

/** Valor de referência de cada raridade, para uma carta de overall 50. */
export const VALOR_BASE: Record<string, number> = {
  common: 60,
  rare: 350,
  'ultra rare': 2000,
  legendary: 18000,
  master: 150000
};

/** Quanto da venda rápida o jogador recebe. Cai conforme a raridade sobe. */
export const QUICKSELL_PCT: Record<string, number> = {
  common: 0.5,
  rare: 0.45,
  'ultra rare': 0.35,
  legendary: 0.25,
  master: 0.15
};

// O overall desloca o valor entre 70% e 130% da base.
const FATOR_MINIMO = 0.7;
const FAIXA_DO_OVERALL = 0.6;

/**
 * Escala global da economia.
 *
 * Precisa ser a MESMA do `.env` do bot. Se os dois divergirem, o site
 * passa a anunciar um preço que o Discord não pratica — e a diferença é
 * silenciosa, ninguém vê um erro, só um número que não bate.
 */
const MULTIPLICADOR =
  Number(process.env.VALOR_MULTIPLICADOR) > 0 ? Number(process.env.VALOR_MULTIPLICADOR) : 1;

function normalizarRaridade(rarity?: string | null): string {
  const chave = String(rarity || RARIDADE_PADRAO)
    .toLowerCase()
    .trim();
  return VALOR_BASE[chave] !== undefined ? chave : RARIDADE_PADRAO;
}

/** Valor de mercado de referência da carta. */
export function valorDeMercado(rarity?: string | null, overall?: number | null): number {
  const base = VALOR_BASE[normalizarRaridade(rarity)];
  const ovr = Math.max(0, Number(overall) || 0);
  const fator = FATOR_MINIMO + FAIXA_DO_OVERALL * (ovr / 100);
  return Math.max(1, Math.round(base * fator * MULTIPLICADOR));
}

/** Quanto a venda rápida paga por essa carta. */
export function valorDeVenda(rarity?: string | null, overall?: number | null): number {
  const pct = QUICKSELL_PCT[normalizarRaridade(rarity)];
  return Math.max(1, Math.round(valorDeMercado(rarity, overall) * pct));
}

export interface ValoresDaCarta {
  rarity: string;
  overall: number;
  marketValue: number;
  valueToSell: number;
}

/** Os dois valores de uma carta já existente. */
export function valoresDaCarta(carta: {
  rarity?: string | null;
  overall?: number | null;
}): ValoresDaCarta {
  const rarity = normalizarRaridade(carta?.rarity);
  const overall = Number(carta?.overall) || 0;
  return {
    rarity,
    overall,
    marketValue: valorDeMercado(rarity, overall),
    valueToSell: valorDeVenda(rarity, overall)
  };
}
