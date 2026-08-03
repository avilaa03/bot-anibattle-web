import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { COLECAO_NOTICIAS, paraNoticia, type Noticia, type NoticiaDoc } from '@/lib/noticias';

/**
 * Notícias — leitura no banco.
 *
 * Separado de `lib/noticias.ts` porque aquele arquivo é importado por um
 * componente de cliente, e importar o driver do Mongo de lá faria o Next
 * tentar empacotá-lo para o navegador.
 *
 * Regra prática do projeto: **arquivo que chama `getDb()` só pode ser
 * importado por Server Component ou por rota de API.** Se um componente
 * com `'use client'` precisar de algo daqui, o dado tem que chegar por
 * prop, vindo do Server Component que o renderiza.
 *
 * A escrita fica em `lib/admin/noticias.ts`.
 */

export async function listarNoticias({ incluirRascunhos = false, limite = 50 } = {}): Promise<Noticia[]> {
  const db = await getDb();
  // Rascunho é `publicada: false`; documentos antigos sem o campo contam
  // como publicados, por isso `$ne` em vez de `: true`.
  const filtro = incluirRascunhos ? {} : { publicada: { $ne: false } };

  const docs = await db.collection<NoticiaDoc>(COLECAO_NOTICIAS)
    .find(filtro)
    .sort({ data: -1, criadaEm: -1 })
    .limit(limite)
    .toArray();

  return docs.map(paraNoticia);
}

export async function buscarNoticia(id: string): Promise<Noticia | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const doc = await db.collection<NoticiaDoc>(COLECAO_NOTICIAS).findOne({ _id: new ObjectId(id) });
  return doc ? paraNoticia(doc) : null;
}
