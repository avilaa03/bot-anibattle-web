/**
 * Nível do jogador.
 *
 * Espelha `bot_anibattle/Commands/utils/nivel.js`. Mudou lá, muda aqui —
 * mesma regra de `valores.ts`, `itens.ts` e `aprimoramento.ts`.
 *
 * ## A carga de roll não aumenta o teto diário
 *
 * É o ponto que o painel precisa deixar claro, porque é contraintuitivo.
 * Com cooldown de 15 min o jogo gera 96 rolls por dia, com ou sem carga.
 * A carga impede que os não usados sejam PERDIDOS enquanto o jogador está
 * fora — ela levanta o piso, não o teto.
 *
 * Quem entra 3 vezes por dia sai de 2 rolls para 8. Quem fica 24h no bot
 * continua em 96.
 */

export const XP = {
  roll: 10,
  batalha: 25,
  vitoria: 25,
  descoberta: 50,
  troca: 30,
  missao: 40,
  diario: 60,
  caixa: 15
} as const;

export const CARGAS_BASE = 1;
export const NIVEIS_DE_CARGA = [10, 20, 30];

/** XP total para chegar ao nível N. */
export function xpDoNivel(n: number): number {
  const nivel = Math.max(1, Math.floor(Number(n) || 1));
  return 50 * nivel * (nivel - 1);
}

/** O nível correspondente a um total de XP. */
export function nivelDoXp(xpTotal?: number | null): number {
  const xp = Math.max(0, Number(xpTotal) || 0);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + xp / 12.5)) / 2));
}

export interface ProgressoDeNivel {
  nivel: number;
  xp: number;
  noNivel: number;
  paraOProximo: number;
  faltam: number;
  percentual: number;
}

export function progresso(xpTotal?: number | null): ProgressoDeNivel {
  const xp = Math.max(0, Number(xpTotal) || 0);
  const nivel = nivelDoXp(xp);

  const inicio = xpDoNivel(nivel);
  const fim = xpDoNivel(nivel + 1);
  const faixa = fim - inicio;

  return {
    nivel,
    xp,
    noNivel: xp - inicio,
    paraOProximo: faixa,
    faltam: fim - xp,
    percentual: faixa > 0 ? ((xp - inicio) / faixa) * 100 : 0
  };
}

/** Quantas cargas o nível concede. Só cresce em degraus. */
export function maxCargas(nivel?: number | null): number {
  const n = Math.max(1, Math.floor(Number(nivel) || 1));
  return CARGAS_BASE + NIVEIS_DE_CARGA.filter((marco) => n >= marco).length;
}

/**
 * Cargas disponíveis agora.
 *
 * ⚠️ `lastRoll` zero significa **nunca rolou**, e devolve o teto cheio.
 * O zero é valor reservado: nada pode gravá-lo para dizer "pode rolar
 * agora", porque a leitura entende "pode rolar o teto inteiro".
 */
export function cargasDisponiveis(
  lastRoll?: number | null,
  cooldown = 15 * 60 * 1000,
  maximo = 1,
  agora = Date.now()
): number {
  const teto = Math.max(1, Math.floor(Number(maximo) || 1));
  const ultimo = Number(lastRoll) || 0;
  if (ultimo <= 0) return teto;

  const decorrido = agora - ultimo;
  if (decorrido < 0) return 0;

  return Math.min(teto, Math.floor(decorrido / cooldown));
}

/** Recompensa de cada nível, para a tabela do painel. */
export const RECOMPENSAS: Record<number, string> = {
  2: '2.000 moedas',
  3: '5 gemas',
  5: 'Caixa Comum + 5.000 moedas',
  10: '+1 carga de roll • 10.000 moedas',
  15: 'Caixa Temática',
  20: '+1 carga de roll • 25.000 moedas',
  25: 'Caixa de Elite',
  30: '+1 carga de roll • 50.000 moedas',
  40: 'Caixa Lendária',
  50: 'Caixa Lendária + 100.000 moedas'
};
