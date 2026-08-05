import { getDb } from '@/lib/mongodb';
import { getItem } from '@/lib/itens';

/**
 * Leitura do livro-razão da economia.
 *
 * Espelha os tipos de `bot_anibattle/Commands/utils/transacoes.js`. O site
 * só LÊ — quem grava é o bot, no momento em que a coisa acontece.
 *
 * ## O sinal do delta é tudo
 *
 * `moedaDelta` positivo significa que a moeda foi CRIADA e entrou no
 * bolso do jogador; negativo, que ela saiu de circulação. É o que separa
 * torneira de sink, e é a conta que responde se a loja está segurando a
 * inflação ou se a venda rápida está imprimindo mais rápido.
 *
 * ## ⚠️ O detalhe expira em 90 dias
 *
 * O bot mantém um índice TTL na coleção. Consulta que peça período maior
 * que isso devolve menos do que deveria — e não é bug, é o desenho. Os
 * totais de vida inteira ficam em `users.stats`.
 */

const COL_TRANSACOES = 'transacoes';

/** Precisa bater com `DIAS_DE_RETENCAO` no schema do bot. */
export const DIAS_DE_RETENCAO = 90;

/** Rótulos legíveis. Espelha `TIPOS` do bot. */
export const TIPOS: Record<string, { nome: string; emoji: string }> = {
  compra: { nome: 'Compra na loja', emoji: '🏪' },
  desmanche: { nome: 'Desmanche de carta', emoji: '🔨' },
  aprimoramento: { nome: 'Tentativa de aprimoramento', emoji: '⬆️' },
  venda_rapida: { nome: 'Venda rápida', emoji: '🪙' },
  mercado_venda: { nome: 'Venda no mercado', emoji: '📤' },
  mercado_compra: { nome: 'Compra no mercado', emoji: '📥' },
  admin: { nome: 'Ajuste administrativo', emoji: '🛠️' }
};

export function rotuloDoTipo(tipo: string): { nome: string; emoji: string } {
  return TIPOS[tipo] ?? { nome: tipo, emoji: '•' };
}

export interface ItemDaLinha {
  chave: string;
  nome: string;
  emoji: string;
  quantidade: number;
}

export interface LinhaDoExtrato {
  id: string;
  tipo: string;
  rotulo: string;
  emoji: string;
  itens: ItemDaLinha[];
  moedaDelta: number;
  saldoDepois: number | null;
  contexto: Record<string, unknown>;
  em: string;
  /** Frase pronta descrevendo a linha, para não repetir a lógica na tela. */
  descricao: string;
}

/**
 * Traduz a linha para uma frase.
 *
 * Fica aqui e não no componente porque a mesma frase serve à ficha do
 * jogador e a qualquer relatório futuro — e porque montar texto dentro do
 * JSX é onde esse tipo de regra costuma se duplicar sem ninguém notar.
 */
function descrever(tipo: string, contexto: Record<string, unknown>, itens: ItemDaLinha[]): string {
  const carta = contexto.carta ? String(contexto.carta) : null;

  if (tipo === 'compra') {
    const i = itens[0];
    return i ? `${i.quantidade}× ${i.nome}` : 'Compra';
  }

  if (tipo === 'desmanche') {
    const ganho = itens.find((x) => x.quantidade > 0);
    return `${carta ?? 'Carta'} → ${ganho ? `${ganho.quantidade} ${ganho.nome}` : 'itens'}`;
  }

  if (tipo === 'aprimoramento') {
    const desfecho = String(contexto.desfecho ?? '');
    const antes = Number(contexto.nivelAntes ?? 0);
    const depois = Number(contexto.nivelDepois ?? 0);
    const protegido = contexto.protegido ? ' (pergaminho segurou)' : '';

    const resultado =
      desfecho === 'sucesso' ? `subiu +${antes} → +${depois}`
        : desfecho === 'queda' ? `caiu +${antes} → +${depois}${protegido}`
          : 'não aconteceu nada';

    return `${carta ?? 'Carta'}: ${resultado}`;
  }

  if (tipo === 'venda_rapida') return `${carta ?? 'Carta'} vendida ao bot`;

  return carta ?? rotuloDoTipo(tipo).nome;
}

function traduzirItens(bruto: unknown): ItemDaLinha[] {
  return ((bruto as Record<string, unknown>[]) || []).map((i) => {
    const chave = String(i.chave ?? '');
    const item = getItem(chave);
    return {
      chave,
      // Item que saiu do catálogo continua legível: o extrato é histórico,
      // e histórico não pode virar "❓" só porque a loja mudou depois.
      nome: item?.nome ?? chave,
      emoji: item?.emoji ?? '📦',
      quantidade: Number(i.quantidade) || 0
    };
  });
}

/** Extrato de um jogador, do mais recente para o mais antigo. */
export async function extratoDoJogador(userId: string, limite = 40): Promise<LinhaDoExtrato[]> {
  const db = await getDb();

  const docs = await db.collection(COL_TRANSACOES)
    .find({ userId: String(userId) })
    .sort({ em: -1 })
    .limit(Math.min(Math.max(1, limite), 200))
    .toArray();

  return docs.map((d) => {
    const tipo = String(d.tipo ?? '');
    const meta = rotuloDoTipo(tipo);
    const itens = traduzirItens(d.itens);
    const contexto = (d.contexto as Record<string, unknown>) || {};

    return {
      id: String(d._id),
      tipo,
      rotulo: meta.nome,
      emoji: meta.emoji,
      itens,
      moedaDelta: Number(d.moedaDelta ?? 0),
      saldoDepois: d.saldoDepois === null || d.saldoDepois === undefined ? null : Number(d.saldoDepois),
      contexto,
      em: d.em ? new Date(d.em as string).toISOString() : '',
      descricao: descrever(tipo, contexto, itens)
    };
  });
}

export interface LinhaDeFluxo {
  tipo: string;
  rotulo: string;
  emoji: string;
  linhas: number;
  jogadores: number;
  /** Somado. Positivo = criou moeda; negativo = destruiu. */
  moeda: number;
}

export interface FluxoDeMoeda {
  dias: number;
  /** Há dados no período? Coleção recém-criada devolve tudo zerado. */
  temDados: boolean;
  linhas: LinhaDeFluxo[];
  /** Moeda criada no período (torneiras). */
  entrou: number;
  /** Moeda destruída no período (sinks). */
  saiu: number;
  /** Entrou menos saiu. Positivo por muito tempo é inflação. */
  liquido: number;
  totalLinhas: number;
}

/**
 * Fluxo de moeda por tipo, num período.
 *
 * É a resposta para "os sinks estão dando conta?". Enquanto `liquido`
 * ficar positivo mês após mês, a moeda em circulação cresce e os preços
 * do mercado sobem junto — foi exatamente o diagnóstico que motivou a
 * loja existir.
 */
export async function fluxoDeMoeda(dias = 7): Promise<FluxoDeMoeda> {
  const db = await getDb();
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const docs = await db.collection(COL_TRANSACOES).aggregate([
    { $match: { em: { $gte: desde } } },
    {
      $group: {
        _id: '$tipo',
        linhas: { $sum: 1 },
        moeda: { $sum: '$moedaDelta' },
        jogadores: { $addToSet: '$userId' }
      }
    },
    { $project: { linhas: 1, moeda: 1, jogadores: { $size: '$jogadores' } } },
    { $sort: { linhas: -1 } }
  ]).toArray();

  const linhas: LinhaDeFluxo[] = docs.map((d) => {
    const tipo = String(d._id ?? '');
    const meta = rotuloDoTipo(tipo);
    return {
      tipo,
      rotulo: meta.nome,
      emoji: meta.emoji,
      linhas: Number(d.linhas ?? 0),
      jogadores: Number(d.jogadores ?? 0),
      moeda: Number(d.moeda ?? 0)
    };
  });

  const entrou = linhas.filter((l) => l.moeda > 0).reduce((s, l) => s + l.moeda, 0);
  const saiu = linhas.filter((l) => l.moeda < 0).reduce((s, l) => s + l.moeda, 0);

  return {
    dias,
    temDados: linhas.length > 0,
    linhas,
    entrou,
    saiu: Math.abs(saiu),
    liquido: entrou + saiu,
    totalLinhas: linhas.reduce((s, l) => s + l.linhas, 0)
  };
}
