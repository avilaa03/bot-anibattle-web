import { listarCodigos, listarResgatesTravados, resumoDeCodigos } from '@/lib/admin/codigos';
import PainelCodigos from '@/components/admin/PainelCodigos';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Códigos de resgate — Administração',
  robots: { index: false, follow: false }
};

export default async function PaginaCodigos() {
  const [codigos, travados, resumo] = await Promise.all([
    listarCodigos(),
    listarResgatesTravados(),
    resumoDeCodigos()
  ]);

  const numeros = [
    { rotulo: 'Códigos gerados', valor: resumo.total },
    { rotulo: 'Ainda válidos', valor: resumo.ativos },
    { rotulo: 'Resgatados', valor: resumo.resgatados },
    { rotulo: 'Entregas travadas', valor: resumo.travados, alerta: resumo.travados > 0 }
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold">Códigos de resgate</h2>
        <p className="mt-2 max-w-3xl text-sm text-textoFraco">
          Um código entrega <strong className="text-texto">qualquer coisa</strong>: VIP, caixas,
          itens, moedas ou cartas — sozinho ou tudo junto. O comprador ativa com{' '}
          <code className="rounded bg-superficie2 px-1 py-0.5">/redeem</code> no Discord,{' '}
          <strong className="text-texto">sem precisar te passar o ID dele</strong>.
        </p>
        <p className="mt-3 max-w-3xl rounded-lg border border-borda bg-superficie p-3 text-sm text-textoFraco">
          ⚠️ Gerar um código é imprimir um vale: quem tiver o texto recebe. Tudo aqui vai para o{' '}
          <strong className="text-texto">log de auditoria</strong> — inclusive as tentativas que
          falharem. Cada código vale <strong className="text-texto">uma vez por jogador</strong>,
          e isso é decidido pelo banco, não por conferência no código.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {numeros.map((n) => (
          <div
            key={n.rotulo}
            className={`cartao p-4 ${n.alerta ? 'border-amber-900/60 bg-amber-950/20' : ''}`}
          >
            <div className="text-xs text-textoFraco">{n.rotulo}</div>
            <div className={`mt-1 text-2xl font-bold ${n.alerta ? 'text-amber-300' : ''}`}>
              {n.valor.toLocaleString('pt-BR')}
            </div>
          </div>
        ))}
      </div>

      <PainelCodigos codigosIniciais={codigos} travados={travados} />
    </div>
  );
}
