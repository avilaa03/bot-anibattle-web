import { valoresDaCarta } from '@/lib/valores';

/**
 * Aprimoramento de cartas.
 *
 * Espelha `bot_anibattle/Commands/utils/aprimoramento.js`. Mudou lá, muda
 * aqui.
 *
 * ## As duas regras que o painel NÃO pode furar
 *
 * 1. **A carta nunca fica pior do que nasceu.** `nivel` nunca é negativo,
 *    e o overall natural é o chão absoluto.
 * 2. **Os atributos saem SEMPRE do natural**, nunca do valor já
 *    aprimorado. Aplicar percentual sobre percentual acumula erro de
 *    arredondamento a cada nível.
 *
 * A segunda é a armadilha do painel: editar `overall`, `ATA`, `LIF` ou
 * `POW` de uma carta aprimorada sem mexer em `base` deixa a carta
 * incoerente — e o erro só aparece no aprimoramento SEGUINTE, quando o
 * bot recalcula tudo a partir de um `base` que não corresponde mais.
 *
 * Por isso o painel edita **nível**, não atributo: mudar o nível
 * recalcula os quatro campos por esta mesma função.
 */

const BASE_SUCESSO: Record<string, number> = {
  common: 0.9,
  rare: 0.8,
  'ultra rare': 0.7,
  legendary: 0.6,
  master: 0.5
};

const CUSTO_BASE: Record<string, number> = {
  common: 1,
  rare: 2,
  'ultra rare': 4,
  legendary: 8,
  master: 15
};

const DECAIMENTO = 0.88;
const PISO_SUCESSO = 0.01;
const QUEDA_POR_NIVEL = 0.02;
const TETO_QUEDA = 0.35;
const CUSTO_POR_NIVEL = 0.6;

function normalizar(raridade?: string | null): string {
  const chave = String(raridade || 'common').toLowerCase().trim();
  return BASE_SUCESSO[chave] !== undefined ? chave : 'common';
}

export function nivelValido(nivel?: number | null): number {
  return Math.max(0, Math.floor(Number(nivel) || 0));
}

export interface Chances {
  sucesso: number;
  nada: number;
  queda: number;
}

/** As três chances neste nível. Somam 1. */
export function chances(raridade?: string | null, nivel = 0): Chances {
  const r = normalizar(raridade);
  const n = nivelValido(nivel);

  const sucesso = Math.max(PISO_SUCESSO, BASE_SUCESSO[r] * Math.pow(DECAIMENTO, n));
  // Em nível 0 não há o que perder: o overall natural é o chão.
  const queda = n === 0 ? 0 : Math.min(TETO_QUEDA, QUEDA_POR_NIVEL * n);

  return { sucesso, queda, nada: Math.max(0, 1 - sucesso - queda) };
}

/** Quantas gemas custa a próxima tentativa. */
export function custoEmGemas(raridade?: string | null, nivel = 0): number {
  const r = normalizar(raridade);
  return Math.max(1, Math.round(CUSTO_BASE[r] * (1 + nivelValido(nivel) * CUSTO_POR_NIVEL)));
}

export interface BaseDaCarta {
  overall: number;
  ATA: number;
  LIF: number;
  POW: number;
}

/**
 * Os valores naturais da carta.
 *
 * Cartas anteriores ao aprimoramento não têm `base` gravado. Nesse caso
 * os valores atuais SÃO os naturais, porque elas nunca subiram.
 */
export function baseDaCarta(carta: Record<string, unknown> | null | undefined): BaseDaCarta {
  const b = carta?.base as Record<string, unknown> | undefined;

  if (b && Number(b.overall) > 0) {
    return {
      overall: Number(b.overall) || 0,
      ATA: Number(b.ATA) || 0,
      LIF: Number(b.LIF) || 0,
      POW: Number(b.POW) || 0
    };
  }

  return {
    overall: Number(carta?.overall) || 0,
    ATA: Number(carta?.ATA) || 0,
    LIF: Number(carta?.LIF) || 0,
    POW: Number(carta?.POW) || 0
  };
}

/** Os atributos de uma carta neste nível, sempre a partir do natural. */
export function statsDoNivel(base: BaseDaCarta, nivel: number): BaseDaCarta {
  const n = nivelValido(nivel);
  const overall = base.overall + n;

  // Se o overall natural fosse 0 (carta corrompida), a divisão explodia.
  const fator = base.overall > 0 ? overall / base.overall : 1;

  return {
    overall,
    ATA: Math.max(1, Math.round(base.ATA * fator)),
    LIF: Math.max(1, Math.round(base.LIF * fator)),
    POW: Math.max(1, Math.round(base.POW * fator))
  };
}

export interface CartaNoNivel extends BaseDaCarta {
  nivel: number;
  marketValue: number;
  valueToSell: number;
  base: BaseDaCarta;
}

/**
 * Como a carta fica num determinado nível.
 *
 * É o que o painel usa para ajustar o nível sem corromper nada: recalcula
 * os quatro atributos e os dois preços a partir do natural, exatamente
 * como o bot faria depois de um `/aprimorar`.
 */
export function cartaNoNivel(
  carta: Record<string, unknown>,
  novoNivel: number
): CartaNoNivel {
  const base = baseDaCarta(carta);
  const nivel = nivelValido(novoNivel);
  const stats = statsDoNivel(base, nivel);

  const preco = valoresDaCarta({
    rarity: String(carta?.rarity ?? 'common'),
    overall: stats.overall
  });

  return {
    nivel,
    ...stats,
    marketValue: preco.marketValue,
    valueToSell: preco.valueToSell,
    base
  };
}

/** "+3" para mostrar junto do nome. Vazio no nível 0. */
export function selo(nivel?: number | null): string {
  const n = nivelValido(nivel);
  return n > 0 ? `+${n}` : '';
}

/** Nome com o selo, como aparece no Discord: "Sasuke Uchiha (+3)". */
export function nomeComSelo(nome: string, nivel?: number | null): string {
  const s = selo(nivel);
  return s ? `${nome} (${s})` : nome;
}
