import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ErroAdmin } from './guarda';
import { gerarCodigo, validarRecompensas, descrever, type Recompensa } from '@/lib/codigos';
import type { Carta } from '@/lib/tipos';

/**
 * Códigos de resgate, do lado do painel.
 *
 * ## O que este arquivo pode e o que ele NÃO pode fazer
 *
 * Ele **cria** e **cancela** códigos. Ele nunca resgata: o resgate mora
 * só no bot, porque a trava contra resgate duplo é o índice único
 * `(codigo, userId)` da coleção `resgates`, e uma trava dessas precisa de
 * um dono só. Duas implementações da mesma regra viram duas regras que
 * discordam no pior momento.
 *
 * A tela LÊ os resgates para mostrar quem usou o quê e quais entregas
 * travaram — leitura é segura de duplicar.
 *
 * ## Por que cancelar em vez de apagar
 *
 * Um código estornado apagado leva junto o rastro de que existiu. É
 * justamente esse rastro que responde ao jogador que jura ter recebido um
 * código válido — e ao Mercado Pago, numa contestação.
 */

const COL_CODIGOS = 'codigos';
const COL_RESGATES = 'resgates';
const COL_CARTAS = 'new-cards';

// Índices criados na primeira escrita do processo. `createIndex` é
// idempotente no Mongo; a flag só evita a chamada de rede repetida.
let indicesCriados = false;

async function garantirIndices(): Promise<void> {
  if (indicesCriados) return;
  indicesCriados = true;
  try {
    const db = await getDb();
    await Promise.all([
      db.collection(COL_CODIGOS).createIndex({ codigo: 1 }, { unique: true }),
      db.collection(COL_CODIGOS).createIndex({ criadoEm: -1 }),
      db.collection(COL_CODIGOS).createIndex({ referencia: 1 }),
      // ESTE é o que sustenta o sistema. O bot também o declara no
      // schema, mas o bot pode nunca ter subido num banco novo — e um
      // código vendido antes disso resgataria duas vezes.
      db.collection(COL_RESGATES).createIndex({ codigo: 1, userId: 1 }, { unique: true })
    ]);
  } catch (err) {
    indicesCriados = false;
    console.error('[codigos] falha ao criar índices:', err);
  }
}

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------

export interface CodigoResumo {
  codigo: string;
  recompensas: Recompensa[];
  descricao: string;
  origem: string;
  referencia: string | null;
  usos: number;
  usosMaximos: number;
  cancelado: boolean;
  motivoCancelamento: string | null;
  expiraEm: string | null;
  criadoEm: string;
  criadoPor: string;
  observacao: string | null;
  /** Derivado, para a tela não repetir a conta em três lugares. */
  estado: 'ativo' | 'esgotado' | 'vencido' | 'cancelado';
}

export interface ResgateResumo {
  codigo: string;
  userId: string;
  estado: string;
  entregues: number[];
  erro: string | null;
  criadoEm: string;
  concluidoEm: string | null;
}

function estadoDe(doc: Record<string, unknown>): CodigoResumo['estado'] {
  if (doc.cancelado === true) return 'cancelado';
  if (doc.expiraEm && new Date(doc.expiraEm as string).getTime() <= Date.now()) return 'vencido';
  if (Number(doc.usos ?? 0) >= Number(doc.usosMaximos ?? 1)) return 'esgotado';
  return 'ativo';
}

function paraResumo(doc: Record<string, unknown>): CodigoResumo {
  const recompensas = (doc.recompensas as Recompensa[]) ?? [];
  return {
    codigo: String(doc.codigo),
    recompensas,
    descricao: recompensas.map(descrever).join(' + '),
    origem: String(doc.origem ?? 'painel'),
    referencia: (doc.referencia as string) ?? null,
    usos: Number(doc.usos ?? 0),
    usosMaximos: Number(doc.usosMaximos ?? 1),
    cancelado: doc.cancelado === true,
    motivoCancelamento: (doc.motivoCancelamento as string) ?? null,
    expiraEm: doc.expiraEm ? new Date(doc.expiraEm as string).toISOString() : null,
    criadoEm: new Date((doc.criadoEm as string) ?? Date.now()).toISOString(),
    criadoPor: String(doc.criadoPor ?? 'sistema'),
    observacao: (doc.observacao as string) ?? null,
    estado: estadoDe(doc)
  };
}

// ---------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------

export async function listarCodigos(limite = 60): Promise<CodigoResumo[]> {
  const db = await getDb();
  const docs = await db.collection(COL_CODIGOS)
    .find({}).sort({ criadoEm: -1 }).limit(limite).toArray();
  return docs.map((d) => paraResumo(d as Record<string, unknown>));
}

/**
 * Resgates que não terminaram.
 *
 * É a lista que você precisa olhar todo dia enquanto estiver vendendo:
 * cada linha aqui é um jogador que pagou e recebeu só parte. O bot marca
 * `falhou` com o erro e os índices do que já saiu, e finalizar é
 * reprocessar de onde parou.
 */
export async function listarResgatesTravados(limite = 30): Promise<ResgateResumo[]> {
  const db = await getDb();
  const docs = await db.collection(COL_RESGATES)
    .find({ estado: { $ne: 'concluido' } })
    .sort({ criadoEm: -1 })
    .limit(limite)
    .toArray();

  return docs.map((d) => ({
    codigo: String(d.codigo),
    userId: String(d.userId),
    estado: String(d.estado),
    entregues: (d.entregues as number[]) ?? [],
    erro: (d.erro as string) ?? null,
    criadoEm: new Date((d.criadoEm as string) ?? Date.now()).toISOString(),
    concluidoEm: d.concluidoEm ? new Date(d.concluidoEm as string).toISOString() : null
  }));
}

/** Quem resgatou um código específico. */
export async function listarResgatesDoCodigo(codigo: string): Promise<ResgateResumo[]> {
  const db = await getDb();
  const docs = await db.collection(COL_RESGATES)
    .find({ codigo: String(codigo).toUpperCase().trim() })
    .sort({ criadoEm: -1 })
    .toArray();

  return docs.map((d) => ({
    codigo: String(d.codigo),
    userId: String(d.userId),
    estado: String(d.estado),
    entregues: (d.entregues as number[]) ?? [],
    erro: (d.erro as string) ?? null,
    criadoEm: new Date((d.criadoEm as string) ?? Date.now()).toISOString(),
    concluidoEm: d.concluidoEm ? new Date(d.concluidoEm as string).toISOString() : null
  }));
}

// ---------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------

export interface EntradaCriacao {
  recompensas: unknown;
  quantos?: unknown;
  usosMaximos?: unknown;
  validadeDias?: unknown;
  origem?: unknown;
  referencia?: unknown;
  observacao?: unknown;
  adminId: string;
}

const ORIGENS = ['painel', 'mercadopago', 'evento', 'parceria'];

/** Teto de códigos por vez. Um zero a mais aqui geraria 10 mil linhas. */
const MAXIMO_POR_LOTE = 200;

/**
 * Cria um lote de códigos.
 *
 * Tudo é validado ANTES da primeira escrita. Gerar 50 e descobrir no 37º
 * que a caixa não existe deixaria 36 códigos bons soltos no banco, sem
 * ninguém para entregá-los.
 */
export async function criarCodigos(entrada: EntradaCriacao): Promise<{
  codigos: string[];
  descricao: string;
}> {
  await garantirIndices();
  const db = await getDb();

  let recompensas: Recompensa[];
  try {
    recompensas = validarRecompensas(entrada.recompensas);
  } catch (err) {
    // O erro de validação é escrito para humano — repassar a mensagem
    // crua é o que faz o painel dizer "Caixa 'lendária' não existe" em
    // vez de "erro ao criar".
    throw new ErroAdmin(err instanceof Error ? err.message : 'Recompensa inválida.');
  }

  // A carta é o único tipo cuja validade depende do banco. Conferir aqui
  // evita vender um código que aponta para uma carta apagada.
  for (const r of recompensas) {
    if (r.tipo !== 'carta') continue;
    const id = String(r.params.cardId);
    const existe = await db.collection<Carta>(COL_CARTAS)
      .findOne({ _id: new ObjectId(id) }, { projection: { _id: 1 } });
    if (!existe) throw new ErroAdmin(`A carta ${id} não está no catálogo.`, 404);
  }

  const quantos = Math.max(1, Math.min(MAXIMO_POR_LOTE, Math.floor(Number(entrada.quantos) || 1)));
  const usosMaximos = Math.max(1, Math.floor(Number(entrada.usosMaximos) || 1));

  const validadeDias = entrada.validadeDias === null || entrada.validadeDias === ''
    ? null
    : Math.floor(Number(entrada.validadeDias) || 365);
  const expiraEm = validadeDias && validadeDias > 0
    ? new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000)
    : null;

  const origem = String(entrada.origem ?? 'painel');
  if (!ORIGENS.includes(origem)) {
    throw new ErroAdmin(`Origem inválida. Use: ${ORIGENS.join(', ')}.`);
  }

  const referencia = String(entrada.referencia ?? '').trim() || null;
  const observacao = String(entrada.observacao ?? '').trim().slice(0, 300) || null;

  const gerados: string[] = [];
  for (let i = 0; i < quantos; i++) {
    // Colisão é astronomicamente improvável, mas o índice único a torna
    // impossível de passar despercebida — e três tentativas resolvem sem
    // que ninguém veja um erro.
    let inserido = false;
    for (let tentativa = 0; tentativa < 3 && !inserido; tentativa++) {
      const codigo = gerarCodigo();
      try {
        await db.collection(COL_CODIGOS).insertOne({
          codigo,
          recompensas,
          origem,
          referencia,
          usos: 0,
          usosMaximos,
          cancelado: false,
          motivoCancelamento: null,
          expiraEm,
          criadoEm: new Date(),
          criadoPor: entrada.adminId,
          observacao
        });
        gerados.push(codigo);
        inserido = true;
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
    if (!inserido) throw new ErroAdmin('Não consegui gerar um código único. Tente de novo.', 500);
  }

  return { codigos: gerados, descricao: recompensas.map(descrever).join(' + ') };
}

/** Cancela um código. Resgates já feitos NÃO são desfeitos. */
export async function cancelarCodigo(codigo: string, motivo: string): Promise<CodigoResumo> {
  const db = await getDb();
  const chave = String(codigo ?? '').toUpperCase().trim();

  const doc = await db.collection(COL_CODIGOS).findOneAndUpdate(
    { codigo: chave },
    { $set: { cancelado: true, motivoCancelamento: motivo || 'cancelado pelo painel' } },
    { returnDocument: 'after' }
  );

  if (!doc) throw new ErroAdmin(`Nenhum código com o texto "${chave}".`, 404);
  return paraResumo(doc as Record<string, unknown>);
}

/** Reativa um código cancelado por engano. */
export async function reativarCodigo(codigo: string): Promise<CodigoResumo> {
  const db = await getDb();
  const chave = String(codigo ?? '').toUpperCase().trim();

  const doc = await db.collection(COL_CODIGOS).findOneAndUpdate(
    { codigo: chave },
    { $set: { cancelado: false, motivoCancelamento: null } },
    { returnDocument: 'after' }
  );

  if (!doc) throw new ErroAdmin(`Nenhum código com o texto "${chave}".`, 404);
  return paraResumo(doc as Record<string, unknown>);
}

/** Números do topo da tela. */
export async function resumoDeCodigos(): Promise<{
  total: number;
  ativos: number;
  resgatados: number;
  travados: number;
}> {
  const db = await getDb();
  const agora = new Date();

  const [total, ativos, resgatados, travados] = await Promise.all([
    db.collection(COL_CODIGOS).countDocuments({}),
    db.collection(COL_CODIGOS).countDocuments({
      cancelado: { $ne: true },
      $or: [{ expiraEm: null }, { expiraEm: { $gt: agora } }],
      $expr: { $lt: ['$usos', '$usosMaximos'] }
    }),
    db.collection(COL_RESGATES).countDocuments({ estado: 'concluido' }),
    db.collection(COL_RESGATES).countDocuments({ estado: { $ne: 'concluido' } })
  ]);

  return { total, ativos, resgatados, travados };
}
