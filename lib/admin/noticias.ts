import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ErroAdmin, texto } from './guarda';
import { NOTICIAS as NOTICIAS_INICIAIS } from '@/data/noticias';
import {
  COLECAO_NOTICIAS,
  ETIQUETAS,
  gerarSlug,
  paraNoticia,
  type EtiquetaNoticia,
  type Noticia,
  type NoticiaDoc
} from '@/lib/noticias';

/**
 * Notícias — escrita.
 *
 * A leitura mora em `lib/noticias.ts`, que é o que as páginas públicas
 * importam. Aqui ficam só as operações que alteram o banco, e este
 * arquivo nunca deve ser importado fora de /admin.
 */

export { ETIQUETAS };
export type { Noticia, EtiquetaNoticia };

/**
 * Copia as notícias do arquivo `data/noticias.ts` para o banco, se a
 * coleção ainda estiver vazia. Roda uma vez só — depois a contagem já
 * não é zero e a função vira no-op.
 */
export async function semearNoticias(): Promise<number> {
  const db = await getDb();
  const colecao = db.collection<NoticiaDoc>(COLECAO_NOTICIAS);

  if (await colecao.countDocuments() > 0) return 0;
  if (NOTICIAS_INICIAIS.length === 0) return 0;

  const agora = new Date();
  const docs: NoticiaDoc[] = NOTICIAS_INICIAIS.map((n) => ({
    slug: n.slug,
    titulo: n.titulo,
    resumo: n.resumo,
    corpo: '',
    data: n.data,
    etiqueta: n.etiqueta,
    destaque: Boolean(n.destaque),
    publicada: true,
    criadaEm: agora,
    atualizadaEm: agora,
    autorId: null,
    autorNome: 'Importada do código'
  }));

  await colecao.insertMany(docs);
  await colecao.createIndex({ slug: 1 }, { unique: true }).catch(() => {});
  return docs.length;
}

interface EntradaNoticia {
  id?: string;
  titulo: unknown;
  resumo: unknown;
  corpo?: unknown;
  data?: unknown;
  etiqueta: unknown;
  destaque?: unknown;
  publicada?: unknown;
}

export async function salvarNoticia(
  entrada: EntradaNoticia,
  autor: { id: string; nome: string }
): Promise<{ noticia: Noticia; criada: boolean; antes: Noticia | null }> {
  const db = await getDb();
  const colecao = db.collection<NoticiaDoc>(COLECAO_NOTICIAS);

  const titulo = texto(entrada.titulo, 'título', { max: 140 });
  const resumo = texto(entrada.resumo, 'resumo', { max: 800 });
  const corpo = texto(entrada.corpo, 'corpo', { obrigatorio: false, max: 20_000 });
  const etiqueta = texto(entrada.etiqueta, 'etiqueta', { max: 20 }) as EtiquetaNoticia;

  if (!ETIQUETAS[etiqueta]) {
    throw new ErroAdmin(`Etiqueta inválida. Use uma de: ${Object.keys(ETIQUETAS).join(', ')}.`);
  }

  const dataInformada = texto(entrada.data, 'data', { obrigatorio: false, max: 10 });
  if (dataInformada && !/^\d{4}-\d{2}-\d{2}$/.test(dataInformada)) {
    throw new ErroAdmin('Data precisa estar no formato AAAA-MM-DD.');
  }
  const data = dataInformada || new Date().toISOString().slice(0, 10);

  const destaque = entrada.destaque === true;
  const publicada = entrada.publicada !== false;
  const agora = new Date();

  // Só uma notícia em destaque por vez: a home mostra uma só, e ter duas
  // marcadas faria a escolhida depender da ordem que o banco devolvesse.
  if (destaque) {
    await colecao.updateMany({ destaque: true }, { $set: { destaque: false } });
  }

  // ---- Edição ----
  if (entrada.id) {
    if (!ObjectId.isValid(String(entrada.id))) throw new ErroAdmin('ID de notícia inválido.');
    const _id = new ObjectId(String(entrada.id));

    const anterior = await colecao.findOne({ _id });
    if (!anterior) throw new ErroAdmin('Notícia não encontrada.', 404);

    await colecao.updateOne({ _id }, {
      $set: {
        titulo, resumo, corpo, data, etiqueta, destaque, publicada,
        atualizadaEm: agora, autorId: autor.id, autorNome: autor.nome
      }
    });

    const atualizada = await colecao.findOne({ _id });
    return { noticia: paraNoticia(atualizada!), criada: false, antes: paraNoticia(anterior) };
  }

  // ---- Criação ----
  let slug = gerarSlug(titulo);
  // Slug repetido quebraria a URL da notícia; acrescentamos um sufixo.
  if (await colecao.countDocuments({ slug }) > 0) slug = `${slug}-${Date.now().toString(36)}`;

  const doc: NoticiaDoc = {
    slug, titulo, resumo, corpo, data, etiqueta, destaque, publicada,
    criadaEm: agora, atualizadaEm: agora,
    autorId: autor.id, autorNome: autor.nome
  };

  const resultado = await colecao.insertOne(doc);
  return { noticia: paraNoticia({ ...doc, _id: resultado.insertedId }), criada: true, antes: null };
}

export async function apagarNoticia(id: string): Promise<Noticia> {
  if (!ObjectId.isValid(id)) throw new ErroAdmin('ID de notícia inválido.');
  const db = await getDb();

  const doc = await db.collection<NoticiaDoc>(COLECAO_NOTICIAS)
    .findOneAndDelete({ _id: new ObjectId(id) });

  if (!doc) throw new ErroAdmin('Notícia não encontrada.', 404);
  return paraNoticia(doc);
}
