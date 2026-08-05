import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { vipAtivo, TIERS } from '@/lib/vip';
import { lerBolsa } from '@/lib/itens';
import { baseDaCarta, nivelValido, custoEmGemas, chances } from '@/lib/aprimoramento';
import { resumirTelemetria, type ResumoTelemetria } from '@/lib/telemetria';
import { PROTECOES } from '@/lib/sorteio';
import { progresso as progressoDeNivel, maxCargas, cargasDisponiveis, type ProgressoDeNivel } from '@/lib/nivel';
import { getPerks } from '@/lib/vip';
import {
  missaoPorChave,
  pontosDeConquistas,
  nivelDeConquistas,
  CONQUISTAS,
  type Conquista
} from '@/lib/conquistas';

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
  /** `cardId` da cópia — o identificador que as ações do painel usam. */
  inventoryId: string;
  cartaId: string | null;
  nome: string;
  serie: string;
  raridade: string;
  overall: number;
  obtidaEm: string | null;
  valor: number;
  // ---- aprimoramento ----
  nivel: number;
  /** Os valores naturais. Se a carta nunca subiu, são os atuais. */
  base: { overall: number; ATA: number; LIF: number; POW: number };
  atributos: { ATA: number; LIF: number; POW: number };
  /** Gemas que a PRÓXIMA tentativa custaria, e as chances dela. */
  proximaTentativa: { gemas: number; sucesso: number; nada: number; queda: number };
  /**
   * A carta está incoerente?
   *
   * Acontece quando alguém editou atributo à mão sem mexer em `base`: o
   * bot recalcula tudo a partir do natural, então o overall gravado
   * deveria ser sempre `base.overall + nivel`. Quando não é, o próximo
   * `/aprimorar` "corrige" a carta sozinho e o jogador vê os números
   * mudarem do nada.
   */
  incoerente: boolean;
}

export interface ItemDaBolsa {
  chave: string;
  nome: string;
  emoji: string;
  quantidade: number;
  /** Item que saiu do catálogo mas continua no banco de alguém. */
  desconhecido: boolean;
}

export interface ContadorDeProtecao {
  campo: string;
  raridade: string;
  atual: number;
  limite: number;
  faltam: number;
  /** O próximo roll já sai garantido. */
  noLimite: boolean;
}

export interface ConquistaDoJogador extends Conquista {
  desbloqueadaEm: string | null;
}

export interface MissaoDoJogador {
  chave: string;
  nome: string;
  descricao: string;
  periodo: 'diaria' | 'semanal';
  progresso: number;
  alvo: number;
  recompensa: number;
  resgatada: boolean;
  completa: boolean;
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
  // ---- adicionados junto das fases 0 a 4 ----
  bolsa: ItemDaBolsa[];
  protecoes: ContadorDeProtecao[];
  telemetria: ResumoTelemetria;
  beta: { participou: boolean; desde: string | null; rollsNaEpoca: number } | null;
  staff: boolean;
  conquistasDetalhe: ConquistaDoJogador[];
  totalConquistas: number;
  pontosConquistas: number;
  nivelConquistas: number;
  missoes: MissaoDoJogador[];
  cartasAprimoradas: number;
  rolls: number;
  // ---- nível (Fase 6) ----
  nivel: ProgressoDeNivel;
  /** Até quantos rolls não usados ele acumula (nível + VIP). */
  tetoDeCargas: number;
  /** Quantos estão disponíveis agora. */
  cargasAgora: number;
  /** Até onde as recompensas já foram pagas. */
  nivelEntregue: number;
  rollExtraGuardado: number;
}

/** Quantas cartas do inventário a ficha carrega. Acima disso a tela trava. */
const LIMITE_INVENTARIO = 300;

/**
 * Cooldown padrão do /roll.
 *
 * Espelha `ROLL_COOLDOWN_MS` do bot. Se você mudar lá pelo .env, mude
 * aqui também — senão o painel mostra "cargas disponíveis" com uma conta
 * diferente da que o jogo pratica.
 */
const COOLDOWN_PADRAO_MS = 15 * 60 * 1000;

export async function buscarFicha(id: string): Promise<FichaJogador | null> {
  const db = await getDb();
  const doc = await db.collection(COL_JOGADORES).findOne({ id });
  if (!doc) return null;

  const totalCatalogo = await db.collection(COL_CARTAS).countDocuments();
  const inventarioBruto = (doc.inventory as Record<string, unknown>[]) || [];

  const inventario: CartaDoInventario[] = inventarioBruto
    .slice(-LIMITE_INVENTARIO)
    .reverse()
    .map((c) => {
      const raridade = String(c.rarity ?? 'common').toLowerCase();
      const nivel = nivelValido(c.nivel as number);
      const base = baseDaCarta(c);
      const overall = Number(c.overall ?? 0);
      const p = chances(raridade, nivel);

      return {
        // `cardId`, não `_id`.
        //
        // Os dois são únicos por cópia (o bot gera um `cardId` novo a cada
        // roll, e o Mongoose gera o `_id`), mas `cardId` é o mais seguro
        // aqui por dois motivos: é o que as ações do painel já usam, e ele
        // está presente até nas cartas antigas dadas pelo painel — que por
        // um tempo entraram no banco SEM `_id`, porque o driver nativo não
        // gera um para subdocumento.
        inventoryId: String(c.cardId ?? ''),
        cartaId: c.originalCardId ? String(c.originalCardId) : null,
        nome: String(c.name ?? '—'),
        serie: String(c.series ?? '—'),
        raridade,
        overall,
        obtidaEm: c.obtainedAt ? new Date(c.obtainedAt as string).toISOString() : null,
        valor: Number(c.marketValue ?? 0),
        nivel,
        base,
        atributos: {
          ATA: Number(c.ATA ?? 0),
          LIF: Number(c.LIF ?? 0),
          POW: Number(c.POW ?? 0)
        },
        proximaTentativa: {
          gemas: custoEmGemas(raridade, nivel),
          sucesso: p.sucesso,
          nada: p.nada,
          queda: p.queda
        },
        // O overall gravado tem que ser exatamente natural + nível. Quando
        // não é, alguém editou atributo sem mexer em `base`.
        incoerente: base.overall > 0 && overall !== base.overall + nivel
      };
    });

  const vip = (doc.vip as Record<string, unknown>) || {};
  const ban = (doc.banimento as Record<string, unknown>) || {};
  const streak = (doc.streak as Record<string, unknown>) || {};
  const cosmeticos = (doc.cosmetics as Record<string, unknown>) || {};
  const stats = (doc.stats as Record<string, unknown>) || {};
  const beta = (doc.beta as Record<string, unknown>) || {};

  const tierKey = (vip.tier as string) || null;

  // ---- nível e cargas ----
  //
  // O cooldown efetivo depende do VIP, então o teto de cargas e quantas
  // estão disponíveis precisam da mesma conta que o bot faz no /roll.
  const perks = getPerks(vip);
  const progressoDoJogador = progressoDeNivel(doc.xp as number);
  const teto = maxCargas(progressoDoJogador.nivel) + (perks.cargasExtras || 0);
  const cooldown = Math.round(COOLDOWN_PADRAO_MS * perks.rollCooldownMultiplier);

  // ---- bolsa ----
  const bolsa: ItemDaBolsa[] = lerBolsa(doc.bolsa).map((linha) => ({
    chave: linha.chave,
    nome: linha.item?.nome ?? linha.chave,
    emoji: linha.item?.emoji ?? '❓',
    quantidade: linha.quantidade,
    desconhecido: linha.item === null
  }));

  // ---- proteção contra azar ----
  const protecoes: ContadorDeProtecao[] = PROTECOES.map((p) => {
    const atual = Number(doc[p.campo] ?? 0);
    return {
      campo: p.campo,
      raridade: p.raridade,
      atual,
      limite: p.limite,
      faltam: Math.max(0, p.limite - atual),
      noLimite: atual >= p.limite
    };
  });

  // ---- conquistas ----
  const conquistasBrutas = (doc.conquistas as Record<string, unknown>[]) || [];
  const chavesConquistas = conquistasBrutas.map((c) => String(c.chave));
  const quando = new Map(
    conquistasBrutas.map((c) => [
      String(c.chave),
      c.desbloqueadaEm ? new Date(c.desbloqueadaEm as string).toISOString() : null
    ])
  );

  // Todas as 28 aparecem, com as obtidas marcadas — ver só as obtidas não
  // ajuda a responder "o que falta para ele platinar?".
  const conquistasDetalhe: ConquistaDoJogador[] = CONQUISTAS.map((c) => ({
    ...c,
    desbloqueadaEm: quando.get(c.chave) ?? null
  }));

  const pontos = pontosDeConquistas(chavesConquistas);

  // ---- missões ----
  const missoesBrutas = (doc.missoes as Record<string, unknown>) || {};
  const lerMissoes = (lista: unknown, periodo: 'diaria' | 'semanal'): MissaoDoJogador[] =>
    ((lista as Record<string, unknown>[]) || []).map((m) => {
      const def = missaoPorChave(String(m.chave));
      const progresso = Number(m.progresso ?? 0);
      const alvo = Number(m.alvo ?? def?.alvo ?? 0);
      return {
        chave: String(m.chave),
        nome: def?.nome ?? String(m.chave),
        descricao: def?.descricao ?? '—',
        periodo,
        progresso,
        alvo,
        recompensa: def?.recompensa ?? 0,
        resgatada: Boolean(m.resgatada),
        completa: alvo > 0 && progresso >= alvo
      };
    });

  const missoes = [
    ...lerMissoes(missoesBrutas.diarias, 'diaria'),
    ...lerMissoes(missoesBrutas.semanais, 'semanal')
  ];

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
    ultimoDaily: doc.lastDaily ? new Date(doc.lastDaily as string).toISOString() : null,
    bolsa,
    protecoes,
    telemetria: resumirTelemetria(doc.telemetria),
    beta: beta.participou
      ? {
        participou: true,
        desde: beta.desde ? new Date(beta.desde as string).toISOString() : null,
        rollsNaEpoca: Number(beta.rollsNaEpoca ?? 0)
      }
      : null,
    staff: Boolean(doc.staff),
    conquistasDetalhe,
    totalConquistas: chavesConquistas.length,
    pontosConquistas: pontos,
    nivelConquistas: nivelDeConquistas(pontos),
    missoes,
    // Conta o inventário INTEIRO, não a fatia carregada na tela: quem tem
    // 500 cartas veria "0 aprimoradas" só porque a +12 dele ficou fora do
    // corte de 300.
    cartasAprimoradas: inventarioBruto.filter((c) => nivelValido(c.nivel as number) > 0).length,
    rolls: Number(stats.rolls ?? 0),
    nivel: progressoDoJogador,
    tetoDeCargas: teto,
    cargasAgora: cargasDisponiveis(Number(doc.lastRoll) || 0, cooldown, teto),
    nivelEntregue: Math.max(1, Number(doc.nivelEntregue) || 1),
    rollExtraGuardado: bolsa.find((i) => i.chave === 'roll_extra')?.quantidade ?? 0
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
