import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { exigirAdminApi, ErroAdmin } from '@/lib/admin/guarda';
import {
  criarEvento,
  selecionarJogadores,
  adicionarParticipantes,
  removerParticipante,
  distribuir,
  encerrarEvento,
  abrirEvento,
  apagarEvento,
  buscarEvento
} from '@/lib/admin/eventos';

export const dynamic = 'force-dynamic';

/**
 * Uma rota, várias ações, escolhidas por `acao` no corpo.
 *
 * ⚠️ `distribuir` é a única ação do painel que cria carta e moeda em
 * massa. A proteção contra pagar duas vezes está no `distribuir()` — no
 * banco, não aqui. Não replique a checagem nesta camada achando que
 * ajuda: duas travas em lugares diferentes viram duas travas que
 * discordam.
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await exigirAdminApi(req);
    const corpo = await req.json();
    const acao = String(corpo.acao ?? '');

    switch (acao) {
      case 'criar': {
        const evento = await criarEvento({
          nome: corpo.nome,
          descricao: corpo.descricao,
          tipo: corpo.tipo,
          premios: corpo.premios,
          adminId: sessao.id
        });
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true, evento });
      }

      case 'selecionar': {
        // Só consulta: devolve a lista para você CONFERIR antes de
        // adicionar. Separar as duas coisas é o que evita "premiei 4 mil
        // pessoas sem querer".
        const r = await selecionarJogadores({
          criterio: corpo.criterio,
          ids: corpo.ids,
          nivelMinimo: corpo.nivelMinimo,
          topRanking: corpo.topRanking,
          diasAtivos: corpo.diasAtivos
        });
        return NextResponse.json({ ok: true, ...r });
      }

      case 'adicionar': {
        const n = await adicionarParticipantes(
          String(corpo.eventoId),
          (corpo.ids as string[]) || []
        );
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true, adicionados: n });
      }

      case 'remover': {
        await removerParticipante(String(corpo.eventoId), String(corpo.userId));
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true });
      }

      case 'distribuir': {
        const resultado = await distribuir(String(corpo.eventoId));
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true, resultado });
      }

      case 'abrir': {
        await abrirEvento(String(corpo.eventoId));
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true });
      }

      case 'encerrar': {
        await encerrarEvento(String(corpo.eventoId));
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true });
      }

      case 'apagar': {
        await apagarEvento(String(corpo.eventoId));
        revalidatePath('/admin/eventos');
        return NextResponse.json({ ok: true });
      }

      case 'detalhe': {
        const evento = await buscarEvento(String(corpo.eventoId));
        if (!evento) throw new ErroAdmin('Evento não encontrado.', 404);
        return NextResponse.json({ ok: true, evento });
      }

      default:
        throw new ErroAdmin(`Ação desconhecida: "${acao}".`);
    }
  } catch (err) {
    if (err instanceof ErroAdmin) {
      return NextResponse.json({ ok: false, erro: err.message }, { status: err.status });
    }
    console.error('[admin/eventos]', err);
    return NextResponse.json({ ok: false, erro: 'Erro interno.' }, { status: 500 });
  }
}
