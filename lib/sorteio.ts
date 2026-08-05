/**
 * Que raridade sai no /roll.
 *
 * Espelha `bot_anibattle/Commands/utils/sorteio.js`. Mudou lá, muda aqui.
 *
 * ## Para que serve no site
 *
 * O painel compara a distribuição **teórica** (esta tabela) com a
 * distribuição **real** do acervo. É a única forma de responder "as taxas
 * estão fazendo o que eu esperava?" sem confiar na sensação — e a
 * diferença entre as duas é o dado mais útil para calibrar `CHANCE_MESTRA`.
 *
 * ⚠️ As duas nunca batem exatamente, e não é bug: o acervo acumula anos de
 * taxas antigas, e o jogador vende, desmancha e troca carta de forma
 * enviesada (ninguém desmancha Mestra). Ver o cabeçalho de
 * `lib/admin/analytics.ts`.
 */

/** Da mais comum para a mais rara. */
export const ORDEM = ['common', 'rare', 'ultra rare', 'legendary', 'master'];

/** Taxas fixas. A Comum não está aqui porque é o RESTO. */
export const CHANCES: Record<string, number> = {
  rare: 25,
  'ultra rare': 9.8,
  legendary: 1.1
};

export const CHANCE_MESTRA_PADRAO = 0.1;

export const CHANCE_MESTRA = (() => {
  const bruto = Number(process.env.CHANCE_MESTRA);
  return Number.isFinite(bruto) && bruto >= 0 ? bruto : CHANCE_MESTRA_PADRAO;
})();

export interface Protecao {
  raridade: string;
  campo: string;
  env: string;
  padrao: number;
  limite: number;
}

function numeroDoEnv(nome: string, padrao: number): number {
  const bruto = Number(process.env[nome]);
  return Number.isFinite(bruto) && bruto > 0 ? bruto : padrao;
}

/**
 * As duas redes de proteção contra azar.
 *
 * Ultra Rara em 40 pega o 1% mais azarado e age com frequência; Lendária
 * em 300 pega o pior ~3% e é a que evita a desistência. A Mestra NUNCA é
 * garantida — ela entrega sorte, não mensalidade.
 */
export const PROTECOES: Protecao[] = [
  {
    raridade: 'ultra rare',
    campo: 'rollsSemUltra',
    env: 'ROLLS_ATE_ULTRA_GARANTIDA',
    padrao: 40,
    limite: numeroDoEnv('ROLLS_ATE_ULTRA_GARANTIDA', 40)
  },
  {
    raridade: 'legendary',
    campo: 'rollsSemLendaria',
    env: 'ROLLS_ATE_LENDARIA_GARANTIDA',
    padrao: 300,
    limite: numeroDoEnv('ROLLS_ATE_LENDARIA_GARANTIDA', 300)
  }
];

export interface FaixaDeChance {
  raridade: string;
  chance: number;
}

/** A tabela de chances, já com a Comum fechando os 100%. */
export function tabelaDeChances(chanceMestra = CHANCE_MESTRA): FaixaDeChance[] {
  const fixas = Object.values(CHANCES).reduce((a, b) => a + b, 0);
  const mestra = Math.min(Math.max(Number(chanceMestra) || 0, 0), 100 - fixas);

  return [
    { raridade: 'common', chance: 100 - fixas - mestra },
    { raridade: 'rare', chance: CHANCES.rare },
    { raridade: 'ultra rare', chance: CHANCES['ultra rare'] },
    { raridade: 'legendary', chance: CHANCES.legendary },
    { raridade: 'master', chance: mestra }
  ];
}

/** 1 a cada quantos rolls, para a taxa dada. */
export function umACada(chance: number): number | null {
  if (!(chance > 0)) return null;
  return Math.round(100 / chance);
}

/**
 * Com quantos rolls por dia no servidor inteiro, de quanto em quanto tempo
 * sai uma carta desta raridade.
 *
 * É a conta que decide se a Mestra ainda parece um evento: ela não depende
 * da taxa individual, e sim do volume do servidor.
 */
export function intervaloNoServidor(chance: number, rollsPorDia: number): number | null {
  if (!(chance > 0) || !(rollsPorDia > 0)) return null;
  const porDia = rollsPorDia * (chance / 100);
  return porDia > 0 ? 24 / porDia : null;
}
