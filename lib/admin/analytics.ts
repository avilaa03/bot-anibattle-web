import { getDb } from '@/lib/mongodb';
import { ORDEM_RARIDADES } from '@/lib/raridades';
import { valorDeMercado } from '@/lib/valores';
import { tabelaDeChances, PROTECOES, CHANCE_MESTRA } from '@/lib/sorteio';
import { todosOsItens } from '@/lib/itens';

/**
 * Números do jogo, para calibrar as taxas e os preços.
 *
 * ## O que este arquivo responde
 *
 * "As taxas novas estão fazendo o que eu esperava?" e "quanto uma Mestra
 * realmente vale?" — as duas perguntas que hoje só têm resposta por
 * sensação, e sensação é exatamente o que erra quando o evento é raro.
 *
 * ## ⚠️ Acervo NÃO é taxa de drop
 *
 * A comparação entre a distribuição do acervo e a tabela de chances é o
 * dado mais útil daqui, e também o mais fácil de ler errado. As duas
 * nunca vão bater, por três motivos que não são bug:
 *
 * 1. **O acervo é histórico.** Ele acumula todas as taxas que já
 *    existiram, inclusive a antiga (Mestra a 1%). Carta rolada em janeiro
 *    continua no inventário em dezembro.
 * 2. **O jogador filtra.** Ninguém desmancha Mestra e todo mundo
 *    desmancha Comum, então o acervo tem *menos* Comum do que o sorteio
 *    entregou.
 * 3. **A proteção contra azar entrega Ultra e Lendária extras** que a
 *    tabela pura não prevê (~0,2% dos rolls).
 *
 * O acervo serve para ver TENDÊNCIA e ordem de grandeza. Para medir a taxa
 * real seria preciso registrar cada roll — e a telemetria hoje só guarda o
 * comportamento, não a raridade entregue.
 */

const COL_JOGADORES = 'users';
const COL_CARTAS = 'new-cards';
const COL_MERCADO = 'markets';

/** Formata como "—" quando não há dado. É o pedido: nada de zero mentiroso. */
export const SEM_DADO = '—';

export interface LinhaRaridade {
  raridade: string;
  /** Quantas cartas dessa raridade existem no catálogo. */
  noCatalogo: number;
  /** Quantas cópias existem nos inventários. */
  emCirculacao: number;
  /** Fatia do acervo, em %. */
  percentualReal: number | null;
  /** Fatia que a tabela de chances prevê, em %. */
  percentualTeorico: number;
  /** Real menos teórico, em pontos percentuais. */
  desvio: number | null;
  /** 1 a cada N rolls, pela tabela. */
  umACada: number | null;
  /** Valor de referência de uma carta média dessa raridade. */
  valorReferencia: number;
  /** Patrimônio somado das cópias em circulação. */
  patrimonio: number;
}

export interface LinhaMercado {
  raridade: string;
  anuncios: number;
  precoMin: number | null;
  precoMediana: number | null;
  precoMax: number | null;
  /** Valor de referência médio das cartas anunciadas. */
  referencia: number | null;
  /**
   * Mediana dividida pela referência. Acima de 1, o mercado paga mais do
   * que a tabela diz — sinal de que o preço base está baixo demais.
   */
  razao: number | null;
}

export interface ResumoEconomia {
  jogadores: number;
  jogadoresAtivos7d: number;
  moedaEmCirculacao: number;
  saldoMediano: number | null;
  patrimonioEmCartas: number;
  cartasEmCirculacao: number;
  anunciosAbertos: number;
  valorAnunciado: number;
}

export interface LinhaItem {
  chave: string;
  nome: string;
  emoji: string;
  preco: number | null;
  /** Quantos existem somados em todas as bolsas. */
  emCirculacao: number;
  /** Quantos jogadores têm pelo menos 1. */
  jogadoresCom: number;
}

export interface ResumoAprimoramento {
  cartasAprimoradas: number;
  nivelMaximo: number;
  /** Quantas cartas em cada nível, do 1 para cima. */
  porNivel: { nivel: number; cartas: number }[];
  /** Maior overall do servidor, e de quem é. */
  recorde: { jogador: string; carta: string; nivel: number; overall: number } | null;
}

export interface ResumoProtecao {
  campo: string;
  raridade: string;
  limite: number;
  env: string;
  /** Jogadores a menos de 20% do limite. */
  perto: number;
  /** Jogadores que já passaram do limite (próximo roll garantido). */
  noLimite: number;
  maior: number;
}

export interface Analytics {
  raridades: LinhaRaridade[];
  mercado: LinhaMercado[];
  economia: ResumoEconomia;
  itens: LinhaItem[];
  aprimoramento: ResumoAprimoramento;
  protecoes: ResumoProtecao[];
  chanceMestra: number;
  geradoEm: string;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0
    ? Math.round((ordenados[meio - 1] + ordenados[meio]) / 2)
    : ordenados[meio];
}

/**
 * Distribuição do acervo por raridade, contra a tabela de chances.
 *
 * O `$unwind` percorre todas as cartas de todos os jogadores. Numa beta
 * isso é barato; se a base crescer muito, este é o primeiro lugar a virar
 * cache ou coleção agregada.
 */
async function porRaridade(): Promise<LinhaRaridade[]> {
  const db = await getDb();

  const [catalogo, circulacao] = await Promise.all([
    db.collection(COL_CARTAS).aggregate([
      { $group: { _id: { $toLower: '$rarity' }, total: { $sum: 1 } } }
    ]).toArray(),
    db.collection(COL_JOGADORES).aggregate([
      { $unwind: '$inventory' },
      {
        $group: {
          _id: { $toLower: { $ifNull: ['$inventory.rarity', 'common'] } },
          total: { $sum: 1 },
          patrimonio: { $sum: { $ifNull: ['$inventory.marketValue', 0] } }
        }
      }
    ], { allowDiskUse: true }).toArray()
  ]);

  const mapaCatalogo = new Map(catalogo.map((c) => [String(c._id), Number(c.total)]));
  const mapaCirculacao = new Map(
    circulacao.map((c) => [String(c._id), { total: Number(c.total), patrimonio: Number(c.patrimonio) }])
  );

  const totalCirculacao = [...mapaCirculacao.values()].reduce((s, v) => s + v.total, 0);
  const teorica = new Map(tabelaDeChances().map((f) => [f.raridade, f.chance]));

  return ORDEM_RARIDADES.map((raridade) => {
    const circ = mapaCirculacao.get(raridade) ?? { total: 0, patrimonio: 0 };
    const percentualReal = totalCirculacao > 0 ? (circ.total / totalCirculacao) * 100 : null;
    const percentualTeorico = teorica.get(raridade) ?? 0;

    return {
      raridade,
      noCatalogo: mapaCatalogo.get(raridade) ?? 0,
      emCirculacao: circ.total,
      percentualReal,
      percentualTeorico,
      desvio: percentualReal === null ? null : percentualReal - percentualTeorico,
      umACada: percentualTeorico > 0 ? Math.round(100 / percentualTeorico) : null,
      // Overall 70 é a carta "média" do catálogo — serve de régua estável
      // para comparar as faixas entre si.
      valorReferencia: valorDeMercado(raridade, 70),
      patrimonio: circ.patrimonio
    };
  });
}

/**
 * Preços praticados no mercado global.
 *
 * O que interessa não é o valor de referência (esse a fórmula já diz), e
 * sim o que os jogadores REALMENTE estão pedindo. A razão entre a mediana
 * praticada e a referência é o número que diz se `VALOR_MULTIPLICADOR`
 * está calibrado: acima de 1 por muito tempo significa que a tabela está
 * barata em relação ao que o jogo pratica.
 */
async function doMercado(): Promise<LinhaMercado[]> {
  const db = await getDb();

  const docs = await db.collection(COL_MERCADO).aggregate([
    { $match: { status: 'available' } },
    {
      $group: {
        _id: { $toLower: { $ifNull: ['$rarity', 'common'] } },
        precos: { $push: { $ifNull: ['$listingPrice', '$marketValue'] } },
        referencias: { $push: { $ifNull: ['$marketValue', 0] } }
      }
    }
  ]).toArray();

  const mapa = new Map(docs.map((d) => [String(d._id), d]));

  return ORDEM_RARIDADES.map((raridade) => {
    const d = mapa.get(raridade);
    const precos = ((d?.precos as number[]) ?? []).map(Number).filter((n) => n > 0);
    const referencias = ((d?.referencias as number[]) ?? []).map(Number).filter((n) => n > 0);

    if (precos.length === 0) {
      // Sem anúncio nenhum: tudo "—". Preencher com zero faria parecer que
      // a raridade não vale nada, quando na verdade ninguém a vendeu.
      return {
        raridade,
        anuncios: 0,
        precoMin: null,
        precoMediana: null,
        precoMax: null,
        referencia: null,
        razao: null
      };
    }

    const medianaPreco = mediana(precos);
    const referencia = referencias.length > 0
      ? Math.round(referencias.reduce((a, b) => a + b, 0) / referencias.length)
      : null;

    return {
      raridade,
      anuncios: precos.length,
      precoMin: Math.min(...precos),
      precoMediana: medianaPreco,
      precoMax: Math.max(...precos),
      referencia,
      razao: referencia && medianaPreco ? medianaPreco / referencia : null
    };
  });
}

async function daEconomia(): Promise<ResumoEconomia> {
  const db = await getDb();
  const seteDias = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const [totais, saldos, mercado, ativos] = await Promise.all([
    db.collection(COL_JOGADORES).aggregate([
      {
        $group: {
          _id: null,
          jogadores: { $sum: 1 },
          moeda: { $sum: { $ifNull: ['$balance', 0] } },
          cartas: { $sum: { $size: { $ifNull: ['$inventory', []] } } }
        }
      }
    ]).toArray(),
    db.collection(COL_JOGADORES).find({}, { projection: { balance: 1 } }).toArray(),
    db.collection(COL_MERCADO).aggregate([
      { $match: { status: 'available' } },
      { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: { $ifNull: ['$listingPrice', 0] } } } }
    ]).toArray(),
    db.collection(COL_JOGADORES).countDocuments({ lastRoll: { $gte: seteDias } })
  ]);

  const patrimonio = await db.collection(COL_JOGADORES).aggregate([
    { $unwind: '$inventory' },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$inventory.marketValue', 0] } } } }
  ], { allowDiskUse: true }).toArray();

  const t = totais[0] ?? {};
  const m = mercado[0] ?? {};

  return {
    jogadores: Number(t.jogadores ?? 0),
    jogadoresAtivos7d: ativos,
    moedaEmCirculacao: Number(t.moeda ?? 0),
    saldoMediano: mediana(saldos.map((s) => Number(s.balance ?? 0))),
    patrimonioEmCartas: Number(patrimonio[0]?.total ?? 0),
    cartasEmCirculacao: Number(t.cartas ?? 0),
    anunciosAbertos: Number(m.total ?? 0),
    valorAnunciado: Number(m.valor ?? 0)
  };
}

async function dosItens(): Promise<LinhaItem[]> {
  const db = await getDb();

  return Promise.all(
    todosOsItens().map(async (item) => {
      const campo = `bolsa.${item.chave}`;
      const [soma] = await db.collection(COL_JOGADORES).aggregate([
        { $match: { [campo]: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: `$${campo}` }, jogadores: { $sum: 1 } } }
      ]).toArray();

      return {
        chave: item.chave,
        nome: item.nome,
        emoji: item.emoji,
        preco: item.preco,
        emCirculacao: Number(soma?.total ?? 0),
        jogadoresCom: Number(soma?.jogadores ?? 0)
      };
    })
  );
}

async function doAprimoramento(): Promise<ResumoAprimoramento> {
  const db = await getDb();

  const porNivel = await db.collection(COL_JOGADORES).aggregate([
    { $unwind: '$inventory' },
    { $match: { 'inventory.nivel': { $gt: 0 } } },
    { $group: { _id: '$inventory.nivel', cartas: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ], { allowDiskUse: true }).toArray();

  const [topo] = await db.collection(COL_JOGADORES).aggregate([
    { $unwind: '$inventory' },
    { $match: { 'inventory.nivel': { $gt: 0 } } },
    { $sort: { 'inventory.overall': -1 } },
    { $limit: 1 },
    {
      $project: {
        id: 1,
        nome: '$inventory.name',
        nivel: '$inventory.nivel',
        overall: '$inventory.overall'
      }
    }
  ], { allowDiskUse: true }).toArray();

  const linhas = porNivel.map((n) => ({ nivel: Number(n._id), cartas: Number(n.cartas) }));

  return {
    cartasAprimoradas: linhas.reduce((s, l) => s + l.cartas, 0),
    nivelMaximo: linhas.length > 0 ? Math.max(...linhas.map((l) => l.nivel)) : 0,
    porNivel: linhas,
    recorde: topo
      ? {
        jogador: String(topo.id),
        carta: String(topo.nome ?? '—'),
        nivel: Number(topo.nivel ?? 0),
        overall: Number(topo.overall ?? 0)
      }
      : null
  };
}

/**
 * Quantos jogadores estão perto de uma garantia.
 *
 * Serve para calibrar as réguas: se ninguém nunca chega perto, a rede é
 * código morto (foi exatamente o caso da versão de 120 rolls). Se muita
 * gente vive no limite, a rede virou a regra e não a exceção.
 */
async function dasProtecoes(): Promise<ResumoProtecao[]> {
  const db = await getDb();

  return Promise.all(
    PROTECOES.map(async (p) => {
      const limiar = Math.floor(p.limite * 0.8);
      const [agregado] = await db.collection(COL_JOGADORES).aggregate([
        { $group: { _id: null, maior: { $max: { $ifNull: [`$${p.campo}`, 0] } } } }
      ]).toArray();

      const [perto, noLimite] = await Promise.all([
        db.collection(COL_JOGADORES).countDocuments({ [p.campo]: { $gte: limiar, $lt: p.limite } }),
        db.collection(COL_JOGADORES).countDocuments({ [p.campo]: { $gte: p.limite } })
      ]);

      return {
        campo: p.campo,
        raridade: p.raridade,
        limite: p.limite,
        env: p.env,
        perto,
        noLimite,
        maior: Number(agregado?.maior ?? 0)
      };
    })
  );
}

export async function carregarAnalytics(): Promise<Analytics> {
  const [raridades, mercado, economia, itens, aprimoramento, protecoes] = await Promise.all([
    porRaridade(),
    doMercado(),
    daEconomia(),
    dosItens(),
    doAprimoramento(),
    dasProtecoes()
  ]);

  return {
    raridades,
    mercado,
    economia,
    itens,
    aprimoramento,
    protecoes,
    chanceMestra: CHANCE_MESTRA,
    geradoEm: new Date().toISOString()
  };
}
