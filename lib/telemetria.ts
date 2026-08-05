/**
 * Leitura da telemetria do /roll.
 *
 * Espelha os cálculos de `bot_anibattle/Commands/utils/telemetria.js` —
 * só a parte de LEITURA. A gravação é do bot; aqui nunca se escreve.
 *
 * ## Isto não é veredito
 *
 * O score ordena uma fila de revisão manual. Nenhum número aqui pune
 * ninguém, e o painel não deve oferecer "banir por score" — falso
 * positivo em detecção automática é irreversível na prática, porque o
 * jogador legítimo banido não volta.
 *
 * O degrau recomendado antes de qualquer banimento é o cooldown
 * progressivo silencioso: o script rende cada vez menos e desiste sozinho,
 * sem você precisar acusar ninguém.
 */

export const LIMIAR_PONTUAL_MS = 5 * 1000;
export const LIMIAR_CLIQUE_MS = 400;
export const AMOSTRAS_MINIMAS = 20;

export interface ResumoTelemetria {
  totalRolls: number;
  amostras: number;
  mediaAtrasoMs: number | null;
  desvioMs: number | null;
  taxaPontual: number;
  horas: number[];
  horasAtivas: number;
  maiorSilencioHoras: number;
  cliques: number;
  mediaCliqueMs: number | null;
  taxaCliqueRapido: number;
  /** null enquanto não houver amostras suficientes. */
  score: number | null;
  ultimosRolls: { em: string; atrasoMs: number }[];
}

/** O histograma vem do Mongo como objeto de chaves '0'..'23'. */
function normalizarHoras(porHora: unknown): number[] {
  const objeto = (porHora as Record<string, unknown>) || {};
  return Array.from({ length: 24 }, (_, h) => Number(objeto[String(h)]) || 0);
}

/**
 * A maior sequência de horas seguidas sem nenhum roll.
 *
 * Circular: quem dorme das 23h às 6h tem o silêncio partido entre o fim e
 * o começo do vetor, e uma leitura linear enxergaria dois buracos pequenos
 * em vez de um grande.
 */
export function maiorSilencio(horas: number[]): number {
  if (horas.every((n) => n === 0)) return 24;
  if (horas.every((n) => n > 0)) return 0;

  let maior = 0;
  let atual = 0;
  for (let i = 0; i < 48; i++) {
    if (horas[i % 24] === 0) {
      atual++;
      maior = Math.max(maior, atual);
    } else {
      atual = 0;
    }
  }
  return Math.min(24, maior);
}

/** Suspeita de 0 a 100. Espelha `pontuar()` do bot. */
function pontuar(dados: {
  taxaPontual: number;
  desvioMs: number | null;
  silencio: number;
  taxaCliqueRapido: number;
  cliques: number;
}): number {
  const { taxaPontual, desvioMs, silencio, taxaCliqueRapido, cliques } = dados;
  let score = 0;

  score += Math.min(40, taxaPontual * 40);

  if (desvioMs !== null) {
    if (desvioMs < 5000) score += 25;
    else if (desvioMs < 30000) score += 15;
    else if (desvioMs < 120000) score += 5;
  }

  if (silencio <= 1) score += 25;
  else if (silencio <= 3) score += 15;
  else if (silencio <= 5) score += 5;

  if (cliques >= 10) score += Math.min(10, taxaCliqueRapido * 10);

  return Math.round(Math.min(100, score));
}

export function resumirTelemetria(bruta: unknown): ResumoTelemetria {
  const t = (bruta as Record<string, unknown>) || {};
  const p = (t.pontualidade as Record<string, unknown>) || {};
  const c = (t.cliques as Record<string, unknown>) || {};

  const amostras = Number(p.amostras) || 0;
  const mediaAtrasoMs = amostras > 0 ? (Number(p.somaAtraso) || 0) / amostras : null;
  const taxaPontual = amostras > 0 ? (Number(p.pontuais) || 0) / amostras : 0;

  // `somaQuadrados` está em segundos², então a média entra em segundos.
  let desvioMs: number | null = null;
  if (amostras > 1 && mediaAtrasoMs !== null) {
    const mediaSeg = mediaAtrasoMs / 1000;
    const variancia = Math.max(0, (Number(p.somaQuadrados) || 0) / amostras - mediaSeg ** 2);
    desvioMs = Math.sqrt(variancia) * 1000;
  }

  const horas = normalizarHoras(t.porHora);
  const silencio = maiorSilencio(horas);

  const cliques = Number(c.amostras) || 0;
  const mediaCliqueMs = cliques > 0 ? (Number(c.soma) || 0) / cliques : null;
  const taxaCliqueRapido = cliques > 0 ? (Number(c.rapidos) || 0) / cliques : 0;

  const ultimos = ((t.ultimosRolls as Record<string, unknown>[]) || [])
    .slice(-20)
    .map((r) => ({
      em: r.em ? new Date(r.em as string).toISOString() : '',
      atrasoMs: Number(r.atrasoMs) || 0
    }));

  return {
    totalRolls: Number(t.totalRolls) || 0,
    amostras,
    mediaAtrasoMs,
    desvioMs,
    taxaPontual,
    horas,
    horasAtivas: horas.filter((n) => n > 0).length,
    maiorSilencioHoras: silencio,
    cliques,
    mediaCliqueMs,
    taxaCliqueRapido,
    score:
      amostras >= AMOSTRAS_MINIMAS
        ? pontuar({ taxaPontual, desvioMs, silencio, taxaCliqueRapido, cliques })
        : null,
    ultimosRolls: ultimos
  };
}

/** Como ler o score, em palavras. */
export function faixaDoScore(score: number | null): { rotulo: string; cor: string } {
  if (score === null) return { rotulo: 'Sem dados', cor: 'text-white/40' };
  if (score >= 70) return { rotulo: 'Revisar', cor: 'text-red-400' };
  if (score >= 40) return { rotulo: 'Observar', cor: 'text-amber-400' };
  return { rotulo: 'Normal', cor: 'text-emerald-400' };
}
