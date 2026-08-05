/**
 * Catálogo de conquistas e missões.
 *
 * Espelha `achievements.js` e `missoes.js` do bot. **Gerado a partir do
 * fonte do bot**, não digitado à mão — são 28 troféus e 15 missões, e
 * transcrever isso na mão é convite a erro silencioso (nome trocado numa
 * entrada que ninguém confere).
 *
 * Só o que o painel precisa MOSTRAR está aqui: chave, nome, descrição e
 * tipo. As funções `condicao` e `progresso` ficam de fora de propósito —
 * quem avalia conquista é o bot, e duplicar a regra criaria duas fontes
 * de verdade sobre quem merece o quê.
 */

export interface TipoConquista {
  emoji: string;
  nome: string;
  pontos: number;
}

export const TIPOS: Record<string, TipoConquista> = {
  bronze: { emoji: "🥉", nome: "Bronze", pontos: 15 },
  prata: { emoji: "🥈", nome: "Prata", pontos: 30 },
  ouro: { emoji: "🥇", nome: "Ouro", pontos: 90 },
  platina: { emoji: "💎", nome: "Platina", pontos: 300 }
};

export interface Conquista {
  chave: string;
  nome: string;
  descricao: string;
  tipo: string;
}

export const CONQUISTAS: Conquista[] = [
  { chave: "primeira_carta", nome: "Primeira de muitas", descricao: "Guarde sua primeira carta no inventário.", tipo: "bronze" },
  { chave: "primeira_vitoria", nome: "Estreia vitoriosa", descricao: "Vença sua primeira batalha.", tipo: "bronze" },
  { chave: "primeira_venda", nome: "Comerciante", descricao: "Venda uma carta no mercado.", tipo: "bronze" },
  { chave: "primeira_troca", nome: "Negociador", descricao: "Complete uma troca com outro jogador.", tipo: "bronze" },
  { chave: "colecionador_10", nome: "Começando a coleção", descricao: "Descubra 10 cartas na Pokédex.", tipo: "bronze" },
  { chave: "rico_1000", nome: "Primeiro milheiro", descricao: "Acumule 1.000 moedas.", tipo: "bronze" },
  { chave: "streak_3", nome: "Criando o hábito", descricao: "Colete a recompensa diária 3 dias seguidos.", tipo: "bronze" },
  { chave: "primeira_rara", nome: "Achado raro", descricao: "Tenha uma carta rara ou melhor.", tipo: "bronze" },
  { chave: "favorita", nome: "Tenho minha preferida", descricao: "Defina uma carta favorita.", tipo: "bronze" },
  { chave: "colecionador_100", nome: "Colecionador", descricao: "Descubra 100 cartas na Pokédex.", tipo: "prata" },
  { chave: "vitorias_25", nome: "Veterano de guerra", descricao: "Vença 25 batalhas.", tipo: "prata" },
  { chave: "rico_100k", nome: "Magnata", descricao: "Acumule 100.000 moedas.", tipo: "prata" },
  { chave: "streak_7", nome: "Uma semana inteira", descricao: "Mantenha 7 dias de sequência no diário.", tipo: "prata" },
  { chave: "lendaria", nome: "Lenda viva", descricao: "Tenha uma carta lendária.", tipo: "prata" },
  { chave: "trocas_10", nome: "Corretor de cartas", descricao: "Complete 10 trocas.", tipo: "prata" },
  { chave: "serie_completa", nome: "Fã de carteirinha", descricao: "Complete todas as cartas de uma série na Pokédex.", tipo: "prata" },
  { chave: "criticos_50", nome: "Golpe certeiro", descricao: "Acerte 50 golpes críticos em batalha.", tipo: "prata" },
  { chave: "virada", nome: "Nunca desista", descricao: "Vença um confronto com um golpe de virada (abaixo de 40% de vida).", tipo: "prata" },
  { chave: "elo_1300", nome: "Competidor", descricao: "Alcance 1300 de pontuação no ranking.", tipo: "prata" },
  { chave: "colecionador_500", nome: "Arquivista", descricao: "Descubra 500 cartas na Pokédex.", tipo: "ouro" },
  { chave: "pokedex_completa", nome: "Catálogo completo", descricao: "Descubra TODAS as cartas do jogo.", tipo: "ouro" },
  { chave: "mestra", nome: "Tocado pelos deuses", descricao: "Tenha uma carta mestra.", tipo: "ouro" },
  { chave: "vitorias_100", nome: "Invencível", descricao: "Vença 100 batalhas.", tipo: "ouro" },
  { chave: "streak_30", nome: "Todo santo dia", descricao: "Mantenha 30 dias de sequência no diário.", tipo: "ouro" },
  { chave: "elo_1600", nome: "Lenda da arena", descricao: "Alcance 1600 de pontuação no ranking.", tipo: "ouro" },
  { chave: "torneio", nome: "Campeão", descricao: "Vença um torneio.", tipo: "ouro" },
  { chave: "deck_lendario", nome: "Time dos sonhos", descricao: "Tenha 3 cartas lendárias ou mestras ao mesmo tempo.", tipo: "ouro" },
  { chave: "platina", nome: "AniBattle Platinado", descricao: "Conquiste todos os outros troféus.", tipo: "platina" }
];

const PORCHAVE = new Map(CONQUISTAS.map((c) => [c.chave, c]));

export function conquistaPorChave(chave?: string | null): Conquista | null {
  return PORCHAVE.get(String(chave ?? '')) ?? null;
}

/** Pontos somados, para o nível de troféus mostrado no /profile. */
export function pontosDeConquistas(chaves: string[]): number {
  return chaves.reduce((total, chave) => {
    const c = conquistaPorChave(chave);
    return total + (c ? (TIPOS[c.tipo]?.pontos ?? 0) : 0);
  }, 0);
}

/** Espelha . */
export function nivelDeConquistas(pontos: number): number {
  return Math.max(1, Math.floor(Math.sqrt(pontos / 25)) + 1);
}

export interface Missao {
  chave: string;
  nome: string;
  descricao: string;
  evento: string;
  alvo: number;
  recompensa: number;
}

export const MISSOES_DIARIAS: Missao[] = [
  { chave: "rolar_3", nome: "Aquecimento", descricao: "Role 3 cartas", evento: "roll", alvo: 3, recompensa: 300 },
  { chave: "rolar_5", nome: "Caçador", descricao: "Role 5 cartas", evento: "roll", alvo: 5, recompensa: 500 },
  { chave: "vencer_1", nome: "Duelista", descricao: "Vença 1 batalha", evento: "vitoria", alvo: 1, recompensa: 400 },
  { chave: "vencer_3", nome: "Dominante", descricao: "Vença 3 batalhas", evento: "vitoria", alvo: 3, recompensa: 900 },
  { chave: "batalhar_2", nome: "Sem medo", descricao: "Participe de 2 batalhas", evento: "batalha", alvo: 2, recompensa: 350 },
  { chave: "descobrir_1", nome: "Novidade", descricao: "Descubra 1 carta nova na Pokédex", evento: "descoberta", alvo: 1, recompensa: 500 },
  { chave: "vender_1", nome: "Feirante", descricao: "Venda 1 carta no mercado", evento: "venda", alvo: 1, recompensa: 300 },
  { chave: "mostrar_1", nome: "Exibido", descricao: "Use /show ou /ficha 1 vez", evento: "consulta", alvo: 1, recompensa: 150 },
  { chave: "critico_5", nome: "Precisão", descricao: "Acerte 5 golpes críticos", evento: "critico", alvo: 5, recompensa: 450 }
];

export const MISSOES_SEMANAIS: Missao[] = [
  { chave: "sem_rolar_20", nome: "Maratona de rolagens", descricao: "Role 20 cartas", evento: "roll", alvo: 20, recompensa: 2500 },
  { chave: "sem_vencer_10", nome: "Temporada vitoriosa", descricao: "Vença 10 batalhas", evento: "vitoria", alvo: 10, recompensa: 3500 },
  { chave: "sem_descobrir_10", nome: "Explorador", descricao: "Descubra 10 cartas novas", evento: "descoberta", alvo: 10, recompensa: 4000 },
  { chave: "sem_trocar_2", nome: "Diplomata", descricao: "Complete 2 trocas", evento: "troca", alvo: 2, recompensa: 3000 },
  { chave: "sem_mercado_3", nome: "Movimentando o mercado", descricao: "Venda ou compre 3 cartas", evento: "mercado", alvo: 3, recompensa: 2800 },
  { chave: "sem_diario_5", nome: "Presença confirmada", descricao: "Colete o diário 5 dias", evento: "diario", alvo: 5, recompensa: 3200 }
];

const MISSAO_PORCHAVE = new Map(
  [...MISSOES_DIARIAS, ...MISSOES_SEMANAIS].map((x) => [x.chave, x])
);

export function missaoPorChave(chave?: string | null): Missao | null {
  return MISSAO_PORCHAVE.get(String(chave ?? '')) ?? null;
}
