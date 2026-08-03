import { getDb } from '@/lib/mongodb';

/**
 * Diagnóstico do sistema: o equivalente web do `npm run check:db` do bot,
 * mais o estado do bot em si.
 *
 * O estado do bot vem da coleção `bot_status`, que o próprio bot escreve
 * a cada minuto (ver `Commands/utils/presenca.js`). O site nunca fala com
 * a API do Discord para isso — precisaria do token do bot, e colocar essa
 * credencial num site hospedado seria trocar conveniência por risco alto.
 */

const COL_STATUS = 'bot_status';
const ID_STATUS = 'principal';

/** Acima disso o carimbo do bot é velho demais para ele estar vivo. */
export const TOLERANCIA_MS = 3 * 60 * 1000;

export interface ServidorConectado {
  id: string;
  nome: string;
  icone: string | null;
  membros: number;
  entrouEm: string | null;
}

export interface EstadoBot {
  configurado: boolean;
  online: boolean;
  atualizadoEm: string | null;
  iniciadoEm: string | null;
  desligadoEm: string | null;
  tag: string | null;
  versaoNode: string | null;
  totalServidores: number;
  totalMembros: number;
  servidores: ServidorConectado[];
}

export async function estadoDoBot(): Promise<EstadoBot> {
  const db = await getDb();
  const doc = await db.collection(COL_STATUS).findOne({ _id: ID_STATUS as never });

  if (!doc) {
    return {
      configurado: false, online: false, atualizadoEm: null, iniciadoEm: null,
      desligadoEm: null, tag: null, versaoNode: null,
      totalServidores: 0, totalMembros: 0, servidores: []
    };
  }

  const atualizadoEm = doc.atualizadoEm ? new Date(doc.atualizadoEm as string) : null;
  const online = Boolean(atualizadoEm && Date.now() - atualizadoEm.getTime() < TOLERANCIA_MS);

  const servidores = ((doc.servidores as Record<string, unknown>[]) || []).map((s) => ({
    id: String(s.id),
    nome: String(s.nome ?? 'Sem nome'),
    icone: (s.icone as string) || null,
    membros: Number(s.membros ?? 0),
    entrouEm: s.entrouEm ? new Date(s.entrouEm as string).toISOString() : null
  }));

  return {
    configurado: true,
    online,
    atualizadoEm: atualizadoEm?.toISOString() ?? null,
    iniciadoEm: doc.iniciadoEm ? new Date(doc.iniciadoEm as string).toISOString() : null,
    desligadoEm: doc.desligadoEm ? new Date(doc.desligadoEm as string).toISOString() : null,
    tag: (doc.bot as { tag?: string })?.tag ?? null,
    versaoNode: (doc.versaoNode as string) || null,
    totalServidores: Number(doc.totalServidores ?? servidores.length),
    totalMembros: Number(doc.totalMembros ?? 0),
    servidores
  };
}

export interface DiagnosticoBanco {
  ok: boolean;
  banco: string;
  latenciaMs: number;
  colecoes: { nome: string; documentos: number }[];
  avisos: string[];
  erro?: string;
}

const ESPERADAS = [
  'new-cards', 'users', 'markets', 'battles', 'payments',
  'trades', 'tournaments', 'noticias', 'auditoria', 'bot_status'
];

export async function diagnosticarBanco(): Promise<DiagnosticoBanco> {
  const inicio = Date.now();

  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    const latenciaMs = Date.now() - inicio;

    const nomes = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);

    const colecoes = await Promise.all(
      nomes.sort().map(async (nome) => ({
        nome,
        documentos: await db.collection(nome).estimatedDocumentCount().catch(() => -1)
      }))
    );

    const avisos: string[] = [];

    // O erro que já derrubou o /roll uma vez: URI sem o nome do banco faz
    // o driver cair no banco "test", vazio.
    if (db.databaseName === 'test') {
      avisos.push(
        'Você está conectado ao banco "test". A MONGODB_URI provavelmente está sem o nome '
        + 'do banco no caminho — é o mesmo erro que já deixou o /roll sem cartas.'
      );
    }

    const cartas = colecoes.find((c) => c.nome === 'new-cards');
    if (!cartas) avisos.push('A coleção "new-cards" não existe. O catálogo está vazio ou o banco é outro.');
    else if (cartas.documentos === 0) avisos.push('O catálogo de cartas está vazio. Rode `npm run seed:cards` no bot.');

    for (const esperada of ESPERADAS) {
      if (!nomes.includes(esperada)) {
        // Só informa; várias só nascem no primeiro uso.
        avisos.push(`Coleção "${esperada}" ainda não existe (normal se a função nunca foi usada).`);
      }
    }

    if (latenciaMs > 800) {
      avisos.push(`Latência de ${latenciaMs} ms até o banco. Acima de 800 ms o bot fica lento para responder.`);
    }

    return { ok: true, banco: db.databaseName, latenciaMs, colecoes, avisos };
  } catch (err) {
    return {
      ok: false,
      banco: '—',
      latenciaMs: Date.now() - inicio,
      colecoes: [],
      avisos: [],
      erro: err instanceof Error ? err.message : 'Erro desconhecido.'
    };
  }
}
