import Link from 'next/link';
import { listarJogadores, contarBanidos } from '@/lib/admin/jogadores';
import { formatarMoedas } from '@/lib/raridades';
import { TIERS } from '@/lib/vip';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jogadores', robots: { index: false, follow: false } };

/**
 * Busca de jogadores.
 *
 * A busca é só por ID do Discord porque é a única identidade que o banco
 * do bot guarda — nome e avatar vêm da API do Discord na hora de exibir,
 * e não ficam salvos. Isso é proposital: dado pessoal que você não guarda
 * é dado que você não precisa proteger nem apagar quando alguém pedir.
 */
export default async function PaginaJogadores({
  searchParams
}: {
  searchParams: Promise<{ busca?: string; ordem?: string }>;
}) {
  const { busca = '', ordem = 'saldo' } = await searchParams;

  const [jogadores, banidos] = await Promise.all([
    listarJogadores({
      busca: busca.trim() || undefined,
      ordem: (ordem as 'saldo' | 'elo' | 'cartas') || 'saldo'
    }),
    contarBanidos()
  ]);

  const buscaInvalida = busca.trim().length > 0 && !/^\d+$/.test(busca.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Jogadores</h2>
          <p className="mt-1 text-sm text-textoFraco">
            Busque pelo ID do Discord para abrir a ficha completa.
            {banidos > 0 && (
              <> {' • '}<span className="text-red-400">{banidos} banido(s)</span></>
            )}
          </p>
        </div>
      </div>

      <form className="cartao flex flex-wrap items-end gap-3 p-4" action="/admin/jogadores">
        <div className="min-w-64 flex-1">
          <label className="rotulo" htmlFor="busca">ID do Discord</label>
          <input
            id="busca" name="busca" defaultValue={busca}
            className="campo mt-1" placeholder="Ex.: 282895755688280065" inputMode="numeric"
          />
        </div>
        <div className="w-44">
          <label className="rotulo" htmlFor="ordem">Ordenar por</label>
          <select id="ordem" name="ordem" defaultValue={ordem} className="campo mt-1">
            <option value="saldo">Maior saldo</option>
            <option value="elo">Maior ELO</option>
            <option value="cartas">Mais cartas</option>
          </select>
        </div>
        <button type="submit" className="botao-primario">Buscar</button>
      </form>

      {buscaInvalida && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-300">
          O banco do bot guarda apenas o ID numérico do Discord, não o nome de usuário. Para achar
          o ID: no Discord, ative <strong>Configurações → Avançado → Modo desenvolvedor</strong>,
          depois clique com o botão direito no usuário e escolha <strong>Copiar ID</strong>.
        </p>
      )}

      <div className="cartao overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-superficie2 text-left text-xs text-textoFraco">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Cartas</th>
              <th className="px-4 py-3 text-right">ELO</th>
              <th className="px-4 py-3">VIP</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {jogadores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-textoFraco">
                  {busca ? 'Nenhum jogador com esse ID.' : 'Nenhum jogador ainda.'}
                </td>
              </tr>
            )}
            {jogadores.map((j) => (
              <tr key={j.id} className={j.banido ? 'bg-red-950/20' : undefined}>
                <td className="px-4 py-3 font-mono text-xs">
                  {j.id}
                  {j.banido && (
                    <span className="ml-2 rounded bg-red-900/60 px-1.5 py-0.5 text-[10px] text-red-200">
                      BANIDO
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{formatarMoedas(j.saldo)}</td>
                <td className="px-4 py-3 text-right">{j.cartas}</td>
                <td className="px-4 py-3 text-right">{j.elo}</td>
                <td className="px-4 py-3">
                  {j.vipTier ? `${TIERS[j.vipTier]?.emoji ?? ''} ${TIERS[j.vipTier]?.nome ?? j.vipTier}` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/jogadores/${j.id}`} className="text-xs text-marca hover:underline">
                    abrir ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
