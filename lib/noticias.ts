import type { ObjectId } from 'mongodb';

/**
 * Notícias — tipos, constantes e formatação.
 *
 * ESTE ARQUIVO NÃO PODE IMPORTAR NADA QUE TOQUE O BANCO.
 *
 * Ele é importado por `components/admin/EditorNoticias.tsx`, que é um
 * componente de cliente. Se aqui entrar um `import { getDb }` ou um
 * `import { ObjectId } from 'mongodb'` (sem o `type`), o Next tenta
 * empacotar o driver do Mongo para o navegador e a compilação quebra com
 * "Module not found: Can't resolve 'net'" — erro que não diz nada sobre
 * a causa real.
 *
 * Repare no `import type` na primeira linha: importação de tipo é apagada
 * na compilação, então ela não puxa o driver para o bundle.
 *
 * As consultas ficam em `lib/noticiasDb.ts` (leitura) e
 * `lib/admin/noticias.ts` (escrita).
 */

export const COLECAO_NOTICIAS = 'noticias';

export type EtiquetaNoticia = 'novidade' | 'atualizacao' | 'evento' | 'aviso';

export const ETIQUETAS: Record<EtiquetaNoticia, { label: string; cor: string }> = {
  novidade: { label: 'Novidade', cor: '#4CAF50' },
  atualizacao: { label: 'Atualização', cor: '#2196F3' },
  evento: { label: 'Evento', cor: '#FF9800' },
  aviso: { label: 'Aviso', cor: '#E53935' }
};

/** Documento como está no banco. */
export interface NoticiaDoc {
  _id?: ObjectId;
  slug: string;
  titulo: string;
  resumo: string;
  corpo: string;
  data: string;              // AAAA-MM-DD
  etiqueta: EtiquetaNoticia;
  destaque: boolean;
  publicada: boolean;
  criadaEm: Date;
  atualizadaEm: Date;
  autorId: string | null;
  autorNome: string | null;
}

/** Versão serializável, para atravessar de Server Component para o cliente. */
export interface Noticia {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  corpo: string;
  data: string;
  etiqueta: EtiquetaNoticia;
  destaque: boolean;
  publicada: boolean;
  autorNome: string | null;
  atualizadaEm: string;
}

export function paraNoticia(doc: NoticiaDoc): Noticia {
  return {
    id: String(doc._id),
    slug: doc.slug,
    titulo: doc.titulo,
    resumo: doc.resumo,
    corpo: doc.corpo || '',
    data: doc.data,
    etiqueta: doc.etiqueta,
    destaque: Boolean(doc.destaque),
    publicada: doc.publicada !== false,
    autorNome: doc.autorNome ?? null,
    atualizadaEm: new Date(doc.atualizadaEm ?? doc.criadaEm ?? Date.now()).toISOString()
  };
}

export function formatarData(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/** Transforma um título em slug de URL. */
export function gerarSlug(titulo: string): string {
  return titulo
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || `noticia-${Date.now()}`;
}
