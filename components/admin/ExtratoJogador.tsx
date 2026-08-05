import { formatarMoedas } from '@/lib/raridades';
import { DIAS_DE_RETENCAO, type LinhaDoExtrato } from '@/lib/admin/transacoes';

/**
 * O extrato de um jogador: o que ele comprou, desmanchou e aprimorou.
 *
 * Antes do livro-razão, nada disso existia — a bolsa guardava só o saldo
 * atual, e gema comprada era indistinguível de gema vinda do desmanche.
 *
 * ## Para que serve na prática
 *
 * Além da curiosidade, é o que permite responder a reclamação. "Gastei 200
 * gemas e não subi nada" deixa de ser palavra do jogador contra a sua: a
 * sequência exata de tentativas está aqui, com desfecho e nível.
 */

const nf = new Intl.NumberFormat('pt-BR');

/** Verde para moeda que entrou, vermelho para a que saiu. */
function Moeda({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-textoFraco">—</span>;
  return (
    <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
      {delta > 0 ? '+' : '−'}
      {formatarMoedas(Math.abs(delta))}
    </span>
  );
}

export default function ExtratoJogador({ linhas }: { linhas: LinhaDoExtrato[] }) {
  return (
    <section className="cartao p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">🧾 Extrato da economia</h3>
        <span className="text-xs text-textoFraco">
          últimos {DIAS_DE_RETENCAO} dias
        </span>
      </div>

      {linhas.length === 0 ? (
        <p className="mt-3 rounded-lg border border-borda bg-superficie2 p-3 text-sm text-textoFraco">
          Nenhum movimento registrado. O livro-razão só grava a partir do momento em que entrou no
          ar — compra, desmanche, aprimoramento e venda rápida anteriores a ele não existem em lugar
          nenhum, e não dá para reconstruir.
        </p>
      ) : (
        <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-lg border border-borda">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-superficie2 text-left text-xs text-textoFraco">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">O quê</th>
                <th className="px-3 py-2">Itens</th>
                <th className="px-3 py-2 text-right">Moeda</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-textoFraco">
                    {l.em ? new Date(l.em).toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">
                      {l.emoji} {l.rotulo}
                    </div>
                    <div className="text-xs text-textoFraco">{l.descricao}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.itens.length === 0 ? (
                      <span className="text-textoFraco">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {l.itens.map((i, n) => (
                          <div
                            key={n}
                            className={i.quantidade > 0 ? 'text-emerald-400' : 'text-red-400'}
                          >
                            {i.quantidade > 0 ? '+' : '−'}
                            {nf.format(Math.abs(i.quantidade))} {i.emoji} {i.nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Moeda delta={l.moedaDelta} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs text-textoFraco">
                    {l.saldoDepois === null ? '—' : formatarMoedas(l.saldoDepois)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
