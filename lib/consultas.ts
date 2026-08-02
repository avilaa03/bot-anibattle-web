import { getDb } from './mongodb';
import { paraCartaSimples, type Carta, type CartaSimples, type EstatisticasSite } from './tipos';
import { ORDEM_RARIDADES } from './raridades';

/**
 * Consultas ao banco do bot.
 *
 * Tudo aqui é SOMENTE LEITURA. O site nunca escreve no banco do jogo —
 * escrita passa pelo bot (webhook de pagamento, comandos). Manter essa
 * separação evita que um bug no site corrompa a economia.
 */

const COLECAO_CARTAS = 'new-cards';
const COLECAO_JOGADORES = 'users';

/** Revalidação do cache: 5 minutos é suficiente para um catálogo. */
export const REVALIDATE = 300;

export async function contarCartas(filtro: Record<string, unknown> = {}): Promise<number> {
  const db = await getDb();
  return db.collection<Carta>(COLECAO_CARTAS).countDocuments(filtro);
}

interface OpcoesListagem {
  pagina?: number;
  porPagina?: number;
  raridade?: string;
  serie?: string;
  busca?: string;
  ordem?: 'numero' | 'overall' | 'nome';
}

/** Escapa texto do usuário antes de virar regex — mesma proteção do bot. */
function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listarCartas(opcoes: OpcoesListagem = {}): Promise<{
  cartas: CartaSimples[];
  total: number;
  paginas: number;
}> {
  const {
    pagina = 1,
    porPagina = 24,
    raridade,
    serie,
    busca,
    ordem = 'numero'
  } = opcoes;

  const db = await getDb();
  const filtro: Record<string, unknown> = {};

  if (raridade && ORDEM_RARIDADES.includes(raridade)) {
    filtro.rarity = raridade;
  }
  if (serie) {
    filtro.series = { $regex: escaparRegex(serie), $options: 'i' };
  }
  if (busca) {
    filtro.name = { $regex: escaparRegex(busca), $options: 'i' };
  }

  const ordenacao: Record<string, 1 | -1> =
    ordem === 'overall' ? { overall: -1, numero: 1 }
      : ordem === 'nome' ? { name: 1 }
        : { numero: 1 };

  const colecao = db.collection<Carta>(COLECAO_CARTAS);
  const [documentos, total] = await Promise.all([
    colecao
      .find(filtro)
      .sort(ordenacao)
      .skip((pagina - 1) * porPagina)
      .limit(porPagina)
      .toArray(),
    colecao.countDocuments(filtro)
  ]);

  return {
    cartas: documentos.map(paraCartaSimples),
    total,
    paginas: Math.max(1, Math.ceil(total / porPagina))
  };
}

export async function buscarCartaPorNumero(numero: number): Promise<CartaSimples | null> {
  const db = await getDb();
  const carta = await db.collection<Carta>(COLECAO_CARTAS).findOne({ numero });
  return carta ? paraCartaSimples(carta) : null;
}

/** Cartas da mesma série, para a página individual sugerir. */
export async function cartasDaMesmaSerie(serie: string, excluirNumero: number, limite = 6): Promise<CartaSimples[]> {
  const db = await getDb();
  const documentos = await db.collection<Carta>(COLECAO_CARTAS)
    .find({ series: serie, numero: { $ne: excluirNumero } })
    .sort({ overall: -1 })
    .limit(limite)
    .toArray();
  return documentos.map(paraCartaSimples);
}

/** Lista de séries com contagem, para o filtro. */
export async function listarSeries(): Promise<{ nome: string; total: number }[]> {
  const db = await getDb();
  const resultado = await db.collection<Carta>(COLECAO_CARTAS).aggregate([
    { $group: { _id: '$series', total: { $sum: 1 } } },
    { $sort: { total: -1, _id: 1 } },
    { $limit: 200 }
  ]).toArray();

  return resultado
    .filter((s) => s._id)
    .map((s) => ({ nome: String(s._id), total: s.total as number }));
}

/** Cartas em destaque na home: as mais raras, sorteadas. */
export async function cartasDestaque(quantidade = 5): Promise<CartaSimples[]> {
  const db = await getDb();
  const documentos = await db.collection<Carta>(COLECAO_CARTAS).aggregate<Carta>([
    { $match: { rarity: { $in: ['legendary', 'master'] } } },
    { $sample: { size: quantidade } }
  ]).toArray();

  // Se o catálogo ainda não tem cartas raras, mostra as melhores que houver.
  if (documentos.length === 0) {
    const alternativa = await db.collection<Carta>(COLECAO_CARTAS)
      .find({})
      .sort({ overall: -1 })
      .limit(quantidade)
      .toArray();
    return alternativa.map(paraCartaSimples);
  }

  return documentos.map(paraCartaSimples);
}

export async function estatisticas(): Promise<EstatisticasSite> {
  const db = await getDb();
  const cartas = db.collection<Carta>(COLECAO_CARTAS);

  const [totalCartas, totalJogadores, porRaridade, series, descobertas] = await Promise.all([
    cartas.countDocuments(),
    db.collection(COLECAO_JOGADORES).countDocuments(),
    cartas.aggregate([{ $group: { _id: '$rarity', total: { $sum: 1 } } }]).toArray(),
    cartas.distinct('series'),
    db.collection(COLECAO_JOGADORES).aggregate([
      { $project: { qtd: { $size: { $ifNull: ['$discovered', []] } } } },
      { $group: { _id: null, total: { $sum: '$qtd' } } }
    ]).toArray()
  ]);

  const cartasPorRaridade: Record<string, number> = {};
  for (const linha of porRaridade) {
    cartasPorRaridade[String(linha._id)] = linha.total as number;
  }

  return {
    totalCartas,
    totalJogadores,
    totalDescobertas: (descobertas[0]?.total as number) ?? 0,
    cartasPorRaridade,
    totalSeries: series.filter(Boolean).length
  };
}
