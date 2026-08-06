import { listarEventos } from '@/lib/admin/eventos';
import { todosOsItens } from '@/lib/itens';
import PainelEventos from '@/components/admin/PainelEventos';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Eventos — Administração',
  robots: { index: false, follow: false }
};

export default async function PaginaEventos() {
  const eventos = await listarEventos();

  // O catálogo de itens vai pronto para o cliente: assim o formulário de
  // prêmio mostra nome e emoji de verdade em vez de pedir a chave crua.
  const itens = todosOsItens().map((i) => ({
    chave: i.chave,
    nome: i.nome,
    emoji: i.emoji ?? '📦'
  }));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-bold">Eventos e premiação</h2>
        <p className="mt-2 max-w-3xl text-sm text-textoFraco">
          Três formas de premiar, dependendo do evento:{' '}
          <strong className="text-texto">distribuição direta</strong> (você escolhe quem recebe),{' '}
          <strong className="text-texto">inscrição no bot</strong> (os jogadores entram pelo{' '}
          <code className="rounded bg-superficie2 px-1 py-0.5">/evento</code>) e{' '}
          <strong className="text-texto">lote</strong> (cola a lista de IDs e premia).
        </p>
        <p className="mt-3 max-w-3xl rounded-lg border border-borda bg-superficie p-3 text-sm text-textoFraco">
          ⚠️ Distribuir cria cartas e moedas de verdade, para muita gente de uma vez.{' '}
          <strong className="text-texto">Ninguém recebe duas vezes</strong> — pode clicar de novo
          sem medo que quem já foi premiado é pulado. O que não dá para desfazer é o pagamento em
          si, então confira a lista antes.
        </p>
      </div>

      <PainelEventos eventosIniciais={eventos} itens={itens} />
    </div>
  );
}
