import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { vipAtivo, TIERS } from '@/lib/vip';

/**
 * Leitura da ficha de um jogador para o painel.
 *
 * Fica separado de `lib/consultas.ts` porque aquele arquivo alimenta o
 * site público e não deve nunca devolver dado administrativo (banimento,
 * saldo, e-mail de pagamento). Aqui é o oposto: só é chamado de dentro de
 * /admin, que já passou pelo layout protegido.
 */

const COL_JOGADORES = 'users';
const COL_CARTAS = 'new-cards';

export interface CartaDoInventario {
  inventoryId: string;
  cartaId: string | null;
  nome: string;
  serie: string;
  raridade: string;
  overall: number;
  obtidaEm: string | null;
  valor: number;
}

export interface FichaJogador {
  id: string;
  existe: boolean;
  saldo: number;
  vitorias: number;
  derrotas: number;
  elo: number;
  picoElo: number;
  totalCartas: number;
  descobertas: number;
  totalCatalogo: number;
  conquistas: number;
  vip: { tier: string | null; nome: string | null; ativo: boolean; expiraEm: string | null; desde: string | null };
  banimento: { ativo: boolean; motivo: string | null; expiraEm: string | null; aplicadoEm: string | null; aplicadoPor: string | null } | null;
  streak: { atual: number; maior: number };
  inventario: CartaDoInventario[];
  cosmeticos: { moldura: string | null; banner: string | null };
  ultimoRoll: string | null;
  ultimoDaily: string | null;
}

/** Quantas cartas do inventário a ficha carrega. Acima disso a tela trava. */
const LIMITE_INVENTARIO = 300;

export async function buscarFicha(id: string): Promise<FichaJogador | null> {
  const db = await getDb();
  const doc = await db.collection(COL_JOGADORES).findOne({ id });
  if (!doc) return null;

  const totalCatalogo = await db.collection(COL_CARTAS).countDocuments();
  const inventarioBruto = (doc.inventory as Record<string, unknown>[]) || [];

  const inventario: CartaDoInventario[] = inventarioBruto
    .slice(-LIMITE_INVENTARIO)
    .reverse()
    .map((c) => ({
      inventoryId: String(c.cardId ?? ''),
      cartaId: c.originalCardId ? String(c.originalCardId) : null,
      nome: String(c.name ?? '—'),
      serie: String(c.series ?? '—'),
      raridade: String(c.rarity ?? 'common').toLowerCase(),
      overall: Number(c.overall ?? 0),
      obtidaEm: c.obtainedAt ? new Date(c.obtainedAt as string).toISOString() : null,
      valor: Number(c.marketValue ?? 0)
    }));

  const vip = (doc.vip as Record<string, unknown>) || {};
  const ban = (doc.banimento as Record<string, unknown>) || {};
  const streak = (doc.streak as Record<string, unknown>) || {};
  const cosmeticos = (doc.cosmetics as Record<string, unknown>) || {};

  const tierKey = (vip.tier as string) || null;

  return {
    id: String(doc.id),
    existe: true,
    saldo: Number(doc.balance ?? 0),
    vitorias: Number(doc.wins ?? 0),
    derrotas: Number(doc.losses ?? 0),
    elo: Number(doc.elo ?? 1000),
    picoElo: Number(doc.picoElo ?? 1000),
    totalCartas: inventarioBruto.length,
    descobertas: ((doc.discovered as unknown[]) || []).length,
    totalCatalogo,
    conquistas: ((doc.conquistas as unknown[]) || []).length,
    vip: {
      tier: tierKey,
      nome: tierKey ? (TIERS[tierKey]?.nome ?? tierKey) : null,
      ativo: vipAtivo(vip),
      expiraEm: vip.expiresAt ? new Date(vip.expiresAt as string).toISOString() : null,
      desde: vip.since ? new Date(vip.since as string).toISOString() : null
    },
    banimento: ban.ativo
      ? {
        ativo: true,
        motivo: (ban.motivo as string) || null,
        expiraEm: ban.expiraEm ? new Date(ban.expiraEm as string).toISOString() : null,
        aplicadoEm: ban.aplicadoEm ? new Date(ban.aplicadoEm as string).toISOString() : null,
        aplicadoPor: (ban.aplicadoPor as string) || null
      }
      : null,
    streak: { atual: Number(streak.atual ?? 0), maior: Number(streak.maior ?? 0) },
    inventario,
    cosmeticos: {
      moldura: (cosmeticos.moldura as string) || null,
      banner: (cosmeticos.banner as string) || null
    },
    ultimoRoll: doc.lastRoll ? new Date(Number(doc.lastRoll)).toISOString() : null,
    ultimoDaily: doc.lastDaily ? new Date(doc.lastDaily as string).toISOString() : null
  };
}

export interface ResumoJogador {
  id: string;
  saldo: number;
  cartas: number;
  elo: number;
  vipTier: string | null;
  banido: boolean;
}

/** Lista para a tela de busca: os maiores, ou os que batem com o ID digitado. */
export async function listarJogadores(opcoes: {
  busca?: string;
  ordem?: 'saldo' | 'elo' | 'cartas';
  limite?: number;
} = {}): Promise<ResumoJogador[]> {
  const { busca, ordem = 'saldo', limite = 40 } = opcoes;
  const db = await getDb();

  const filtro: Record<string, unknown> = {};
  if (busca) {
    // Só dígitos: é um ID do Discord, então busca por prefixo.
    if (/^\d+$/.test(busca)) filtro.id = { $regex: `^${busca}` };
    else return []; // nome não existe no banco do bot — só o ID identifica
  }

  const ordenacao: Record<string, 1 | -1> =
    ordem === 'elo' ? { elo: -1 } : { balance: -1 };

  const docs = await db.collection(COL_JOGADORES).aggregate([
    { $match: filtro },
    {
      $project: {
        id: 1,
        balance: 1,
        elo: 1,
        'vip.tier': 1,
        'banimento.ativo': 1,
        cartas: { $size: { $ifNull: ['$inventory', []] } }
      }
    },
    { $sort: ordem === 'cartas' ? { cartas: -1 } : ordenacao },
    { $limit: limite }
  ]).toArray();

  return docs.map((d) => ({
    id: String(d.id),
    saldo: Number(d.balance ?? 0),
    cartas: Number(d.cartas ?? 0),
    elo: Number(d.elo ?? 1000),
    vipTier: (d.vip?.tier as string) || null,
    banido: Boolean(d.banimento?.ativo)
  }));
}

/** Autocomplete de cartas do catálogo, para os formulários de ação. */
export async function procurarCartas(termo: string, limite = 20) {
  const db = await getDb();
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const filtro: Record<string, unknown> = escapado
    ? { $or: [{ name: { $regex: escapado, $options: 'i' } }, { series: { $regex: escapado, $options: 'i' } }] }
    : {};

  const docs = await db.collection(COL_CARTAS)
    .find(filtro)
    .project({ name: 1, series: 1, rarity: 1, overall: 1, numero: 1 })
    .sort({ numero: 1 })
    .limit(limite)
    .toArray();

  return docs.map((c) => ({
    id: String(c._id),
    numero: (c.numero as number) ?? null,
    nome: String(c.name),
    serie: String(c.series),
    raridade: String(c.rarity).toLowerCase(),
    overall: Number(c.overall ?? 0)
  }));
}

/** Total de jogadores banidos, para o resumo do painel. */
export async function contarBanidos(): Promise<number> {
  const db = await getDb();
  return db.collection(COL_JOGADORES).countDocuments({ 'banimento.ativo': true });
}

export { ObjectId };
