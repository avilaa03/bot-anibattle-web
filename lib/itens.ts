/**
 * Catálogo de itens da bolsa.
 *
 * Espelha `bot_anibattle/Commands/utils/itens.js`. Mudou lá, muda aqui —
 * mesma regra de `valores.ts`, `raridades.ts` e `vip.ts`.
 *
 * ## A regra que sustenta a economia: item NÃO vira moeda
 *
 * Nada aqui pode ser vendido, trocado ou convertido de volta em saldo. A
 * moeda entra em item e para ali. No momento em que existe caminho de
 * volta, abre-se uma alça: compra barato de um lado, converte, vende do
 * outro, e a diferença vira renda infinita.
 *
 * **Isso vale para o painel também.** Dar item pelo painel é dar poder de
 * aprimoramento, não dinheiro — por isso "dar gema" e "ajustar moedas"
 * são ações separadas, e nenhuma delas converte uma na outra.
 */

/**
 * Preço da gema.
 *
 * Precisa ser o MESMO do `.env` do bot. Se divergirem, o painel mostra um
 * preço que a `/loja` não pratica — e a diferença é silenciosa.
 */
export const PRECO_GEMA =
  Number(process.env.PRECO_GEMA) > 0 ? Number(process.env.PRECO_GEMA) : 150;

/** Quantas gemas cada raridade rende no `/desmanchar`. */
export const GEMAS_POR_DESMANCHE: Record<string, number> = {
  common: 1,
  rare: 3,
  'ultra rare': 10,
  legendary: 40,
  master: 150
};

export interface Item {
  chave: string;
  nome: string;
  emoji: string;
  descricao: string;
  preco: number | null;
  consumivel: boolean;
  ordem: number;
}

export const ITENS: Record<string, Item> = {
  gema: {
    chave: 'gema',
    nome: 'Gema de aprimoramento',
    emoji: '💎',
    descricao: 'Material do /aprimorar. Some ao ser usada, dando certo ou não.',
    preco: PRECO_GEMA,
    consumivel: true,
    ordem: 1
  },
  pergaminho: {
    chave: 'pergaminho',
    nome: 'Pergaminho de proteção',
    emoji: '📜',
    descricao: 'Segura a perda de nível quando um aprimoramento de risco falha.',
    preco: 25000,
    consumivel: true,
    ordem: 2
  },
  /**
   * `preco: null` porque ele não é comprado no `/loja comprar`: o preço
   * escalona dentro do dia (ver `utils/extraRoll.js` no bot), e um item de
   * preço fixo não representaria isso. A compra tem porta própria.
   *
   * Estava faltando neste espelho, o que impedia o painel de colocá-lo num
   * código de resgate — o bot conhece a chave desde sempre.
   */
  roll_extra: {
    chave: 'roll_extra',
    nome: 'Roll extra',
    emoji: '🎟️',
    descricao: 'Adianta um /roll sem esperar o cooldown. Use com /roll extra:True.',
    preco: null,
    consumivel: true,
    ordem: 3
  }
};

/** Todos os itens, na ordem de exibição. */
export function todosOsItens(): Item[] {
  return Object.values(ITENS).sort((a, b) => a.ordem - b.ordem);
}

export function getItem(chave?: string | null): Item | null {
  return ITENS[String(chave || '').toLowerCase().trim()] ?? null;
}

/**
 * A chave existe no catálogo?
 *
 * Guarda de tudo que escreve na bolsa. A chave vira caminho de campo no
 * Mongo (`bolsa.<chave>`), então aceitar chave arbitrária deixaria o
 * painel escrever campo inventado no documento do jogador.
 */
export function existe(chave?: string | null): boolean {
  return getItem(chave) !== null;
}

export function gemasDoDesmanche(raridade?: string | null): number {
  const chave = String(raridade || 'common').toLowerCase().trim();
  return GEMAS_POR_DESMANCHE[chave] ?? GEMAS_POR_DESMANCHE.common;
}

/**
 * Lê a bolsa do documento do jogador.
 *
 * No Mongo ela é um objeto (o Mongoose grava Map como objeto). Itens que
 * saíram do catálogo continuam aparecendo, marcados como desconhecidos —
 * esconder deixaria o admin sem explicação para um número que não fecha.
 */
export function lerBolsa(bruta: unknown): { item: Item | null; chave: string; quantidade: number }[] {
  const objeto = (bruta as Record<string, unknown>) || {};

  return Object.entries(objeto)
    .map(([chave, valor]) => ({
      chave,
      item: getItem(chave),
      quantidade: Number(valor) || 0
    }))
    .filter((linha) => linha.quantidade !== 0)
    .sort((a, b) => (a.item?.ordem ?? 99) - (b.item?.ordem ?? 99));
}
