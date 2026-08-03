import { estatisticas } from '@/lib/consultas';
import EditorCartas from '@/components/admin/EditorCartas';
import { RARIDADES, ORDEM_RARIDADES } from '@/lib/raridades';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cartas', robots: { index: false, follow: false } };

export default async function PaginaCartas() {
  const stats = await estatisticas();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Catálogo</h2>
        <p className="mt-1 text-sm text-textoFraco">
          {stats.totalCartas} cartas de {stats.totalSeries} séries.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ORDEM_RARIDADES.map((r) => (
          <div key={r} className="cartao p-4">
            <div className="text-xl font-bold" style={{ color: RARIDADES[r].cor }}>
              {stats.cartasPorRaridade[r] ?? 0}
            </div>
            <div className="mt-0.5 text-xs text-textoFraco">{RARIDADES[r].label}</div>
          </div>
        ))}
      </div>

      <div className="cartao p-4 text-sm text-textoFraco">
        Para cadastrar cartas <strong className="text-texto">em massa</strong>, continue usando os
        scripts do bot: <code className="rounded bg-superficie2 px-1 py-0.5">npm run import:anilist</code> baixa
        personagens do AniList e <code className="rounded bg-superficie2 px-1 py-0.5">npm run seed:cards</code> grava
        no banco. Esta tela é para o caso avulso — uma carta nova, uma correção, uma imagem quebrada.
      </div>

      <EditorCartas />
    </div>
  );
}
