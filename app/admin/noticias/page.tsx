import { listarNoticias } from '@/lib/noticiasDb';
import { semearNoticias } from '@/lib/admin/noticias';
import EditorNoticias from '@/components/admin/EditorNoticias';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notícias', robots: { index: false, follow: false } };

export default async function PaginaNoticias() {
  // Primeira visita: copia as notícias que estavam no código para o banco.
  // Roda uma vez só — depois a coleção já não está vazia.
  const semeadas = await semearNoticias();
  const noticias = await listarNoticias({ incluirRascunhos: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notícias</h2>
        <p className="mt-1 text-sm text-textoFraco">
          O que você publicar aqui aparece na página inicial imediatamente.
        </p>
      </div>

      {semeadas > 0 && (
        <p className="rounded-lg border border-blue-900/50 bg-blue-950/30 p-4 text-sm text-blue-300">
          {semeadas} notícia(s) que estavam escritas no código foram importadas para o banco. Daqui
          em diante você edita tudo por esta tela — <code>data/noticias.ts</code> vira só histórico.
        </p>
      )}

      <EditorNoticias noticias={noticias} />
    </div>
  );
}
