import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { exigirAdminApi, ErroAdmin, ipDaRequisicao } from '@/lib/admin/guarda';
import { registrarAuditoria } from '@/lib/admin/auditoria';
import {
  criarCodigos,
  cancelarCodigo,
  reativarCodigo,
  listarResgatesDoCodigo
} from '@/lib/admin/codigos';

export const dynamic = 'force-dynamic';

/**
 * Rotas de código de resgate.
 *
 * ## Por que TODA ação aqui vai para a auditoria
 *
 * Um código é dinheiro: ele pode dar VIP, caixa e moeda a quem o
 * apresentar. Gerar um código é o equivalente a imprimir um vale — e a
 * pergunta que aparece no dia em que a economia parecer estranha é sempre
 * a mesma: "quem gerou isso e quando".
 *
 * Registramos inclusive as tentativas que FALHARAM. Uma sequência de
 * erros de validação seguida de um sucesso é exatamente o rastro de
 * alguém tateando o que o painel aceita.
 */
export async function POST(req: NextRequest) {
  let sessao;
  try {
    sessao = await exigirAdminApi(req);
  } catch (err) {
    const status = err instanceof ErroAdmin ? err.status : 500;
    return NextResponse.json(
      { ok: false, erro: err instanceof Error ? err.message : 'Erro interno.' },
      { status }
    );
  }

  const ip = ipDaRequisicao(req);
  let acao = '';

  try {
    const corpo = await req.json();
    acao = String(corpo.acao ?? '');

    switch (acao) {
      case 'criar': {
        const r = await criarCodigos({
          recompensas: corpo.recompensas,
          quantos: corpo.quantos,
          usosMaximos: corpo.usosMaximos,
          validadeDias: corpo.validadeDias,
          origem: corpo.origem,
          referencia: corpo.referencia,
          observacao: corpo.observacao,
          adminId: sessao.id
        });

        await registrarAuditoria({
          adminId: sessao.id,
          adminNome: sessao.nome,
          acao: 'codigo_criar',
          rotulo: 'Gerar códigos de resgate',
          alvoTipo: 'sistema',
          // Sem alvo: o código ainda não tem dono. Quem resgatou fica na
          // coleção `resgates`, que a tela mostra ao lado.
          alvoId: null,
          motivo: String(corpo.observacao ?? '') || null,
          resumo: `${r.codigos.length} código(s) — ${r.descricao}`,
          antes: null,
          detalhes: {
            codigos: r.codigos,
            recompensas: corpo.recompensas,
            usosMaximos: corpo.usosMaximos ?? 1,
            origem: corpo.origem ?? 'painel',
            referencia: corpo.referencia ?? null
          },
          ip,
          resultado: 'ok'
        });

        revalidatePath('/admin/codigos');
        return NextResponse.json({ ok: true, ...r });
      }

      case 'cancelar': {
        const motivo = String(corpo.motivo ?? '').trim();
        if (!motivo) throw new ErroAdmin('Diga o motivo do cancelamento — ele fica na auditoria.');

        const doc = await cancelarCodigo(String(corpo.codigo), motivo);

        await registrarAuditoria({
          adminId: sessao.id,
          adminNome: sessao.nome,
          acao: 'codigo_cancelar',
          rotulo: 'Cancelar código de resgate',
          alvoTipo: 'sistema',
          alvoId: doc.codigo,
          motivo,
          resumo: `${doc.codigo} cancelado (${doc.usos}/${doc.usosMaximos} já usados).`,
          antes: { cancelado: false },
          detalhes: { codigo: doc.codigo, recompensas: doc.recompensas },
          ip,
          resultado: 'ok'
        });

        revalidatePath('/admin/codigos');
        return NextResponse.json({ ok: true, codigo: doc });
      }

      case 'reativar': {
        const doc = await reativarCodigo(String(corpo.codigo));

        await registrarAuditoria({
          adminId: sessao.id,
          adminNome: sessao.nome,
          acao: 'codigo_reativar',
          rotulo: 'Reativar código de resgate',
          alvoTipo: 'sistema',
          alvoId: doc.codigo,
          motivo: String(corpo.motivo ?? '') || null,
          resumo: `${doc.codigo} voltou a valer.`,
          antes: { cancelado: true },
          detalhes: { codigo: doc.codigo },
          ip,
          resultado: 'ok'
        });

        revalidatePath('/admin/codigos');
        return NextResponse.json({ ok: true, codigo: doc });
      }

      case 'resgates': {
        // Só leitura — não vai para a auditoria. Registrar consulta
        // encheria o log e afogaria as escritas, que são o que importa.
        const resgates = await listarResgatesDoCodigo(String(corpo.codigo));
        return NextResponse.json({ ok: true, resgates });
      }

      default:
        throw new ErroAdmin(`Ação desconhecida: "${acao}".`);
    }
  } catch (err) {
    const status = err instanceof ErroAdmin ? err.status : 500;
    const mensagem = err instanceof Error ? err.message : 'Erro inesperado.';

    if (status === 500) console.error('[admin/codigos]', err);

    // A tentativa falha também é registro. Ver o cabeçalho.
    if (acao && acao !== 'resgates') {
      await registrarAuditoria({
        adminId: sessao.id,
        adminNome: sessao.nome,
        acao: `codigo_${acao}`,
        rotulo: 'Código de resgate (falhou)',
        alvoTipo: 'sistema',
        alvoId: null,
        motivo: null,
        resumo: mensagem,
        antes: null,
        detalhes: {},
        ip,
        resultado: 'erro',
        erro: mensagem
      });
    }

    return NextResponse.json(
      { ok: false, erro: status === 500 ? 'Erro interno. Veja o console do servidor.' : mensagem },
      { status }
    );
  }
}
