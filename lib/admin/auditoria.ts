import type { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';

/**
 * Log de auditoria do painel.
 *
 * Toda escrita administrativa passa por aqui, inclusive as que falham.
 * O motivo é simples: um painel que distribui carta e moeda é uma
 * impressora de dinheiro. No dia em que aparecer um jogador com 500 mil
 * moedas do nada, a única pergunta que importa é "quem fez isso e
 * quando" — e sem log a resposta não existe.
 *
 * Guardamos o estado ANTES da operação (`antes`) porque é o que permite
 * desfazer um erro. Saber que você deu VIP não ajuda muito; saber que a
 * pessoa era "prata até 12/09" antes é o que deixa reverter.
 *
 * O log NUNCA é apagado pelo painel, e não existe rota de escrita para
 * ele. Registro que o próprio suspeito pode editar não é auditoria.
 */

export const COLECAO_AUDITORIA = 'auditoria';

export type AlvoAuditoria = 'jogador' | 'carta' | 'noticia' | 'sistema';

export interface RegistroAuditoria {
  _id?: ObjectId;
  quando: Date;
  adminId: string;
  adminNome: string;
  acao: string;
  rotulo: string;
  alvoTipo: AlvoAuditoria;
  alvoId: string | null;
  motivo: string | null;
  resumo: string;
  antes: unknown;
  detalhes: Record<string, unknown>;
  ip: string | null;
  resultado: 'ok' | 'erro';
  erro?: string;
}

// Os índices são criados na primeira escrita do processo. Criar índice é
// idempotente no Mongo, então a única coisa que a flag evita é a chamada
// de rede repetida a cada registro.
let indicesCriados = false;

async function garantirIndices(db: Awaited<ReturnType<typeof getDb>>): Promise<void> {
  if (indicesCriados) return;
  indicesCriados = true;
  const colecao = db.collection(COLECAO_AUDITORIA);
  await Promise.all([
    colecao.createIndex({ quando: -1 }),
    colecao.createIndex({ alvoId: 1, quando: -1 }),
    colecao.createIndex({ adminId: 1, quando: -1 })
  ]).catch(() => {
    // Sem índice o log ainda funciona, só fica lento. Tentamos de novo
    // no próximo registro.
    indicesCriados = false;
  });
}

export async function registrarAuditoria(
  registro: Omit<RegistroAuditoria, 'quando' | '_id'>
): Promise<void> {
  try {
    const db = await getDb();
    await garantirIndices(db);
    await db.collection<RegistroAuditoria>(COLECAO_AUDITORIA).insertOne({
      ...registro,
      quando: new Date()
    } as RegistroAuditoria);
  } catch (err) {
    // Falhar ao gravar o log não pode desfazer a operação já aplicada,
    // mas precisa gritar no console — auditoria quebrada em silêncio é
    // pior que auditoria ausente, porque dá falsa sensação de cobertura.
    console.error('[auditoria] NÃO FOI POSSÍVEL GRAVAR O REGISTRO:', err);
  }
}

export interface FiltroAuditoria {
  pagina?: number;
  porPagina?: number;
  alvoId?: string;
  acao?: string;
  adminId?: string;
}

export async function listarAuditoria(filtro: FiltroAuditoria = {}): Promise<{
  registros: RegistroAuditoria[];
  total: number;
  paginas: number;
}> {
  const { pagina = 1, porPagina = 50, alvoId, acao, adminId } = filtro;

  const db = await getDb();
  const consulta: Record<string, unknown> = {};
  if (alvoId) consulta.alvoId = alvoId;
  if (acao) consulta.acao = acao;
  if (adminId) consulta.adminId = adminId;

  const colecao = db.collection<RegistroAuditoria>(COLECAO_AUDITORIA);
  const [registros, total] = await Promise.all([
    colecao.find(consulta).sort({ quando: -1 })
      .skip((pagina - 1) * porPagina).limit(porPagina).toArray(),
    colecao.countDocuments(consulta)
  ]);

  return { registros, total, paginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Últimas ações de um administrador ou sobre um alvo, para a ficha. */
export async function ultimasAcoesDoAlvo(alvoId: string, limite = 10): Promise<RegistroAuditoria[]> {
  const db = await getDb();
  return db.collection<RegistroAuditoria>(COLECAO_AUDITORIA)
    .find({ alvoId }).sort({ quando: -1 }).limit(limite).toArray();
}
