import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ErroAdmin } from './guarda';
import { valoresDaCarta } from '@/lib/valores';
import { getItem } from '@/lib/itens';
import { xpDoNivel } from '@/lib/nivel';
import type { Carta } from '@/lib/tipos';

/**
 * Eventos e premiação em lote.
 *
 * ## Os três modos são o mesmo evento
 *
 * O que muda é só COMO os participantes entram na lista:
 *
 *   direto      você escolhe os jogadores no painel
 *   inscricao   os jogadores entram pelo `/evento` no Discord
 *   lote        sem lista: você cola os IDs e premia, sem guardar evento
 *
 * A premiação é idêntica nos três. Ter três fluxos de entrega separados
 * seria três chances de um deles pagar errado.
 *
 * ## A regra que não pode falhar: NÃO PAGAR DUAS VEZES
 *
 * Distribuir um evento é a operação mais perigosa do painel — ela cria
 * carta e moeda para muita gente de uma vez. Se o navegador cair no meio,
 * se você clicar duas vezes, ou se recarregar a página e mandar de novo,
 * o pagamento não pode repetir.
 *
 * Por isso cada participante carrega `premiado`, e a entrega é feita um a
 * um com o filtro `premiado: false` NA PRÓPRIA ESCRITA. Quem já recebeu
 * não casa com o filtro e é pulado — não por conferência no código, mas
 * porque o banco recusa.
 *
 * É o mesmo desenho do `trySpend` e do `bolsa.consumir`.
 */

const COL_EVENTOS = 'eventos';
const COL_JOGADORES = 'users';
const COL_CARTAS = 'new-cards';

export type TipoEvento = 'direto' | 'inscricao' | 'lote';
export type StatusEvento = 'rascunho' | 'aberto' | 'encerrado';

export interface PremioCarta {
  cartaId: string;
  nome: string;
  raridade: string;
  quantidade: number;
}

export interface Premios {
  moedas: number;
  cartas: PremioCarta[];
  /** chave do item -> quantidade */
  itens: Record<string, number>;
}

export interface Participante {
  userId: string;
  entrouEm: string;
  premiado: boolean;
  premiadoEm: string | null;
}

export interface Evento {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoEvento;
  status: StatusEvento;
  premios: Premios;
  participantes: Participante[];
  totalParticipantes: number;
  totalPremiados: number;
  criadoEm: string;
  criadoPor: string;
  encerradoEm: string | null;
}

/** Como escolher os participantes no modo direto. */
export type CriterioSelecao = 'ids' | 'beta' | 'nivel' | 'ranking' | 'ativos';

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

function paraEvento(doc: Record<string, unknown>): Evento {
  const participantes = ((doc.participantes as Record<string, unknown>[]) || []).map((p) => ({
    userId: String(p.userId),
    entrouEm: p.entrouEm ? new Date(p.entrouEm as string).toISOString() : '',
    premiado: Boolean(p.premiado),
    premiadoEm: p.premiadoEm ? new Date(p.premiadoEm as string).toISOString() : null
  }));

  const premios = (doc.premios as Record<string, unknown>) || {};

  return {
    id: String(doc._id),
    nome: String(doc.nome ?? 'Sem nome'),
    descricao: String(doc.descricao ?? ''),
    tipo: (doc.tipo as TipoEvento) ?? 'direto',
    status: (doc.status as StatusEvento) ?? 'rascunho',
    premios: {
      moedas: Number(premios.moedas ?? 0),
      cartas: ((premios.cartas as PremioCarta[]) || []).map((c) => ({
        cartaId: String(c.cartaId),
        nome: String(c.nome ?? '—'),
        raridade: String(c.raridade ?? 'common'),
        quantidade: Number(c.quantidade ?? 1)
      })),
      itens: (premios.itens as Record<string, number>) || {}
    },
    participantes,
    totalParticipantes: participantes.length,
    totalPremiados: participantes.filter((p) => p.premiado).length,
    criadoEm: doc.criadoEm ? new Date(doc.criadoEm as string).toISOString() : '',
    criadoPor: String(doc.criadoPor ?? '—'),
    encerradoEm: doc.encerradoEm ? new Date(doc.encerradoEm as string).toISOString() : null
  };
}

export async function listarEventos(limite = 50): Promise<Evento[]> {
  const db = await getDb();
  const docs = await db.collection(COL_EVENTOS)
    .find({})
    .sort({ criadoEm: -1 })
    .limit(limite)
    .toArray();

  return docs.map(paraEvento);
}

export async function buscarEvento(id: string): Promise<Evento | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection(COL_EVENTOS).findOne({ _id: new ObjectId(id) });
  return doc ? paraEvento(doc) : null;
}

// ---------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------

/**
 * Valida e normaliza os prêmios.
 *
 * As cartas são resolvidas contra o catálogo AGORA, e nome e raridade
 * ficam gravados no evento. Assim o histórico continua legível depois de
 * a carta ser editada ou apagada — um evento que diz "prêmio: carta
 * apagada #undefined" não serve para nada.
 */
async function normalizarPremios(bruto: unknown): Promise<Premios> {
  const p = (bruto as Record<string, unknown>) || {};
  const db = await getDb();

  const moedas = Math.max(0, Math.floor(Number(p.moedas) || 0));

  const cartasBrutas = (p.cartas as Record<string, unknown>[]) || [];
  const cartas: PremioCarta[] = [];

  for (const c of cartasBrutas) {
    const id = String(c.cartaId ?? '');
    if (!ObjectId.isValid(id)) throw new ErroAdmin(`"${id}" não é um ID de carta válido.`);

    const doc = await db.collection<Carta>(COL_CARTAS).findOne({ _id: new ObjectId(id) });
    if (!doc) throw new ErroAdmin('Uma das cartas do prêmio não existe mais no catálogo.', 404);

    cartas.push({
      cartaId: id,
      nome: doc.name,
      raridade: String(doc.rarity).toLowerCase(),
      quantidade: Math.max(1, Math.min(100, Math.floor(Number(c.quantidade) || 1)))
    });
  }

  const itens: Record<string, number> = {};
  for (const [chave, valor] of Object.entries((p.itens as Record<string, unknown>) || {})) {
    const n = Math.max(0, Math.floor(Number(valor) || 0));
    if (n === 0) continue;
    if (!getItem(chave)) throw new ErroAdmin(`Item "${chave}" não existe no catálogo.`);
    itens[chave] = n;
  }

  if (moedas === 0 && cartas.length === 0 && Object.keys(itens).length === 0) {
    throw new ErroAdmin('O evento precisa de pelo menos um prêmio: moedas, carta ou item.');
  }

  return { moedas, cartas, itens };
}

export async function criarEvento(entrada: {
  nome: unknown;
  descricao?: unknown;
  tipo: unknown;
  premios: unknown;
  adminId: string;
}): Promise<Evento> {
  const db = await getDb();

  const nome = String(entrada.nome ?? '').trim();
  if (nome.length < 3) throw new ErroAdmin('O evento precisa de um nome com pelo menos 3 caracteres.');

  const tipo = String(entrada.tipo ?? 'direto') as TipoEvento;
  if (!['direto', 'inscricao', 'lote'].includes(tipo)) {
    throw new ErroAdmin('Tipo inválido. Use direto, inscricao ou lote.');
  }

  const premios = await normalizarPremios(entrada.premios);

  const doc = {
    nome,
    descricao: String(entrada.descricao ?? '').trim().slice(0, 500),
    tipo,
    // Evento de inscrição já nasce aberto: se ficasse em rascunho, o
    // jogador não veria no `/evento` e você teria que lembrar de abrir.
    status: (tipo === 'inscricao' ? 'aberto' : 'rascunho') as StatusEvento,
    premios,
    participantes: [] as Participante[],
    criadoEm: new Date(),
    criadoPor: entrada.adminId,
    encerradoEm: null
  };

  const r = await db.collection(COL_EVENTOS).insertOne(doc);
  return paraEvento({ ...doc, _id: r.insertedId });
}

/**
 * Encontra jogadores por critério.
 *
 * Devolve só os IDs — quem decide se eles entram no evento é a tela, e a
 * separação existe para você poder CONFERIR a lista antes de premiar.
 */
export async function selecionarJogadores(opcoes: {
  criterio: CriterioSelecao;
  ids?: string;
  nivelMinimo?: number;
  topRanking?: number;
  diasAtivos?: number;
}): Promise<{ ids: string[]; descricao: string }> {
  const db = await getDb();
  const col = db.collection(COL_JOGADORES);

  switch (opcoes.criterio) {
    case 'ids': {
      // Aceita vírgula, espaço ou quebra de linha — colar de qualquer
      // lugar precisa funcionar.
      const ids = String(opcoes.ids ?? '')
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{5,25}$/.test(s));

      if (ids.length === 0) throw new ErroAdmin('Nenhum ID válido na lista.');

      // Só quem existe: premiar um ID digitado errado cria um documento
      // fantasma que nunca vai ser reclamado.
      const existentes = await col.find({ id: { $in: ids } }).project({ id: 1 }).toArray();
      const achados = existentes.map((d) => String(d.id));
      const faltando = ids.filter((i) => !achados.includes(i));

      return {
        ids: achados,
        descricao: `${achados.length} de ${ids.length} ID(s) encontrados`
          + (faltando.length ? ` — sem conta: ${faltando.slice(0, 5).join(', ')}` : '')
      };
    }

    case 'beta': {
      const docs = await col.find({ 'beta.participou': true }).project({ id: 1 }).toArray();
      return { ids: docs.map((d) => String(d.id)), descricao: `${docs.length} participante(s) da beta` };
    }

    case 'nivel': {
      const minimo = Math.max(1, Math.floor(Number(opcoes.nivelMinimo) || 1));
      // O nível é derivado do XP, então o filtro precisa ser por XP.
      // Pela função de verdade, e não por uma cópia da fórmula aqui: a
      // cópia sobrevive a uma mudança de curva e passa a selecionar
      // gente errada em silêncio.
      const xpMinimo = xpDoNivel(minimo);
      const docs = await col.find({ xp: { $gte: xpMinimo } }).project({ id: 1, xp: 1 }).toArray();
      return {
        ids: docs.map((d) => String(d.id)),
        descricao: `${docs.length} jogador(es) no nível ${minimo} ou acima`
      };
    }

    case 'ranking': {
      const quantos = Math.max(1, Math.min(100, Math.floor(Number(opcoes.topRanking) || 10)));
      const docs = await col.find({ wins: { $gt: 0 } })
        .sort({ elo: -1 })
        .limit(quantos)
        .project({ id: 1 })
        .toArray();
      return { ids: docs.map((d) => String(d.id)), descricao: `top ${docs.length} do ranking` };
    }

    case 'ativos': {
      const dias = Math.max(1, Math.min(365, Math.floor(Number(opcoes.diasAtivos) || 7)));
      const desde = Date.now() - dias * 24 * 60 * 60 * 1000;
      const docs = await col.find({ lastRoll: { $gte: desde } }).project({ id: 1 }).toArray();
      return { ids: docs.map((d) => String(d.id)), descricao: `${docs.length} ativo(s) nos últimos ${dias} dias` };
    }

    default:
      throw new ErroAdmin('Critério de seleção inválido.');
  }
}

/** Acrescenta participantes sem duplicar. */
export async function adicionarParticipantes(eventoId: string, ids: string[]): Promise<number> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');
  const db = await getDb();

  const evento = await db.collection(COL_EVENTOS).findOne({ _id: new ObjectId(eventoId) });
  if (!evento) throw new ErroAdmin('Evento não encontrado.', 404);

  const jaTem = new Set(((evento.participantes as Participante[]) || []).map((p) => p.userId));
  const novos = [...new Set(ids)].filter((id) => !jaTem.has(id));

  if (novos.length === 0) return 0;

  await db.collection(COL_EVENTOS).updateOne(
    { _id: new ObjectId(eventoId) },
    {
      $push: {
        participantes: {
          $each: novos.map((userId) => ({
            userId,
            entrouEm: new Date(),
            premiado: false,
            premiadoEm: null
          }))
        }
      } as never
    }
  );

  return novos.length;
}

export async function removerParticipante(eventoId: string, userId: string): Promise<void> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');
  const db = await getDb();

  const evento = await db.collection(COL_EVENTOS).findOne({ _id: new ObjectId(eventoId) });
  if (!evento) throw new ErroAdmin('Evento não encontrado.', 404);

  const participante = ((evento.participantes as Participante[]) || []).find((p) => p.userId === userId);
  if (participante?.premiado) {
    throw new ErroAdmin(
      'Esse jogador já foi premiado. Tirar da lista não desfaz a entrega — remova os prêmios pela ficha dele.'
    );
  }

  await db.collection(COL_EVENTOS).updateOne(
    { _id: new ObjectId(eventoId) },
    { $pull: { participantes: { userId } } as never }
  );
}

// ---------------------------------------------------------------------
// Distribuição
// ---------------------------------------------------------------------

/**
 * Monta a cópia de carta que vai para o inventário.
 *
 * ⚠️ Espelha `montarCopia` de `acoes.ts`, que espelha o `rollCollect.js`
 * do bot. Os três precisam mudar juntos.
 *
 * O `_id` explícito é obrigatório: o driver nativo não gera um para item
 * de array de subdocumento, e sem ele a carta aparece no inventário mas
 * batalha, troca e mercado respondem "essa carta não está mais no seu
 * inventário". Já aconteceu.
 */
function montarCopiaDeCarta(carta: Carta) {
  const { marketValue, valueToSell } = valoresDaCarta(carta);
  return {
    _id: new ObjectId(),
    cardId: new ObjectId(),
    originalCardId: carta._id,
    name: carta.name,
    series: carta.series,
    seriesImage: carta.seriesImage ?? '',
    baseImage: carta.baseImage ?? '',
    characterImage: carta.characterImage,
    rarity: carta.rarity,
    overall: carta.overall,
    ATA: carta.ATA,
    LIF: carta.LIF,
    POW: carta.POW,
    obtainedAt: new Date(),
    marketValue,
    valueToSell,
    // Congela a negociabilidade na entrega: carta de evento marcada como
    // vinculada precisa chegar vinculada.
    comercializavel: carta.comercializavel !== false
  };
}

export interface ResultadoDistribuicao {
  premiados: number;
  jaPremiados: number;
  falhas: { userId: string; motivo: string }[];
  cartasEntregues: number;
  moedasEntregues: number;
}

/**
 * Paga os prêmios a quem ainda não recebeu.
 *
 * ## Por que um a um, e não um `updateMany`
 *
 * Cada jogador precisa de cópias de carta com `_id` PRÓPRIO — um
 * `updateMany` empurraria o mesmo documento para todo mundo, e todos
 * ficariam com a mesma carta, com o mesmo id. Aí a primeira venda
 * quebraria as outras.
 *
 * É mais lento e é o certo.
 *
 * ## A marca de pago vem PRIMEIRO
 *
 * A escrita que marca `premiado: true` carrega `premiado: false` no
 * filtro. Se ela não casar, o jogador já recebeu e é pulado — a decisão é
 * do banco, não de uma conferência no código.
 *
 * Marcar antes de pagar troca o risco: em vez de pagar duas vezes numa
 * falha, no pior caso alguém fica sem receber e aparece no relatório como
 * falha, para você pagar à mão. Pagar duas vezes cria moeda do nada e não
 * tem como desfazer sem saber quem recebeu o quê.
 */
export async function distribuir(eventoId: string): Promise<ResultadoDistribuicao> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');

  const db = await getDb();
  const oid = new ObjectId(eventoId);

  const evento = await db.collection(COL_EVENTOS).findOne({ _id: oid });
  if (!evento) throw new ErroAdmin('Evento não encontrado.', 404);

  const premios = (evento.premios as Premios) || { moedas: 0, cartas: [], itens: {} };
  const participantes = (evento.participantes as Participante[]) || [];

  const pendentes = participantes.filter((p) => !p.premiado);
  const jaPremiados = participantes.length - pendentes.length;

  if (pendentes.length === 0) {
    return { premiados: 0, jaPremiados, falhas: [], cartasEntregues: 0, moedasEntregues: 0 };
  }

  // Carrega o catálogo uma vez só: são as mesmas cartas para todo mundo.
  const cartasDoCatalogo = new Map<string, Carta>();
  for (const premio of premios.cartas) {
    const doc = await db.collection<Carta>(COL_CARTAS).findOne({ _id: new ObjectId(premio.cartaId) });
    if (doc) cartasDoCatalogo.set(premio.cartaId, doc);
  }

  const resultado: ResultadoDistribuicao = {
    premiados: 0,
    jaPremiados,
    falhas: [],
    cartasEntregues: 0,
    moedasEntregues: 0
  };

  for (const participante of pendentes) {
    // 1) Reserva. `premiado: false` no filtro é a trava contra pagar duas
    //    vezes — se outro clique já marcou, este não casa e desiste.
    const reserva = await db.collection(COL_EVENTOS).updateOne(
      { _id: oid, participantes: { $elemMatch: { userId: participante.userId, premiado: false } } },
      {
        $set: {
          'participantes.$.premiado': true,
          'participantes.$.premiadoEm': new Date()
        }
      }
    );

    if (reserva.modifiedCount === 0) continue;

    // 2) Paga.
    try {
      const copias = [];
      for (const premio of premios.cartas) {
        const carta = cartasDoCatalogo.get(premio.cartaId);
        if (!carta) continue;
        for (let i = 0; i < premio.quantidade; i++) copias.push(montarCopiaDeCarta(carta));
      }

      const atualizacao: Record<string, unknown> = {};

      if (premios.moedas > 0) atualizacao.$inc = { balance: premios.moedas };

      for (const [chave, n] of Object.entries(premios.itens)) {
        atualizacao.$inc = { ...(atualizacao.$inc as object), [`bolsa.${chave}`]: n };
      }

      if (copias.length > 0) {
        atualizacao.$push = { inventory: { $each: copias } };
      }

      if (Object.keys(atualizacao).length > 0) {
        await db.collection(COL_JOGADORES).updateOne({ id: participante.userId }, atualizacao);
      }

      // A Pokédex registra a descoberta, igual ao "dar cartas".
      for (const premio of premios.cartas) {
        const cartaOid = new ObjectId(premio.cartaId);
        await db.collection(COL_JOGADORES).updateOne(
          { id: participante.userId, 'discovered.cardId': { $ne: cartaOid } },
          { $push: { discovered: { cardId: cartaOid, firstObtainedAt: new Date() } } as never }
        );
      }

      resultado.premiados++;
      resultado.cartasEntregues += copias.length;
      resultado.moedasEntregues += premios.moedas;
    } catch (err) {
      // A marca já foi posta. Reportamos para pagamento manual em vez de
      // desmarcar: desmarcar reabriria a porta do pagamento duplo se o
      // erro tiver acontecido DEPOIS da escrita ter valido.
      resultado.falhas.push({
        userId: participante.userId,
        motivo: err instanceof Error ? err.message : 'erro desconhecido'
      });
    }
  }

  return resultado;
}

/** Fecha o evento. Inscrição encerrada, prêmios já distribuídos ficam. */
export async function encerrarEvento(eventoId: string): Promise<void> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');
  const db = await getDb();
  await db.collection(COL_EVENTOS).updateOne(
    { _id: new ObjectId(eventoId) },
    { $set: { status: 'encerrado' as StatusEvento, encerradoEm: new Date() } }
  );
}

/** Abre um evento de inscrição, para os jogadores enxergarem no /evento. */
export async function abrirEvento(eventoId: string): Promise<void> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');
  const db = await getDb();
  await db.collection(COL_EVENTOS).updateOne(
    { _id: new ObjectId(eventoId) },
    { $set: { status: 'aberto' as StatusEvento } }
  );
}

export async function apagarEvento(eventoId: string): Promise<void> {
  if (!ObjectId.isValid(eventoId)) throw new ErroAdmin('Evento inválido.');
  const db = await getDb();

  const evento = await db.collection(COL_EVENTOS).findOne({ _id: new ObjectId(eventoId) });
  if (!evento) throw new ErroAdmin('Evento não encontrado.', 404);

  const premiados = ((evento.participantes as Participante[]) || []).filter((p) => p.premiado).length;
  if (premiados > 0) {
    throw new ErroAdmin(
      `Este evento já premiou ${premiados} jogador(es). Apagar apagaria o registro de quem recebeu o quê — `
      + 'encerre em vez de apagar.'
    );
  }

  await db.collection(COL_EVENTOS).deleteOne({ _id: new ObjectId(eventoId) });
}
