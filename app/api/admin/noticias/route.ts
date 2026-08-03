import { revalidatePath } from 'next/cache';
import { rotaAdmin, ipDaRequisicao, texto, ErroAdmin } from '@/lib/admin/guarda';
import { salvarNoticia, apagarNoticia } from '@/lib/admin/noticias';
import { buscarNoticia } from '@/lib/noticiasDb';
import { registrarAuditoria } from '@/lib/admin/auditoria';

/**
 * Criar, editar e apagar notícias.
 *
 * Depois de gravar, `revalidatePath('/')` derruba o cache da home — sem
 * isso a notícia só apareceria quando a revalidação por tempo vencesse, e
 * você acharia que o salvamento não funcionou.
 */

export const dynamic = 'force-dynamic';

export const POST = rotaAdmin(async (req, sessao) => {
  const corpo = await req.json().catch(() => {
    throw new ErroAdmin('Corpo da requisição não é um JSON válido.');
  });

  const operacao = texto(corpo.operacao, 'operacao', { max: 20 });
  const autor = { id: sessao.id, nome: sessao.nome };

  // ---- Apagar ----
  if (operacao === 'apagar') {
    const id = texto(corpo.id, 'id', { max: 32 });
    const motivo = texto(corpo.motivo, 'motivo', { obrigatorio: false, max: 300 });

    // Apagar é destrutivo: exige confirmação com o título exato.
    // A conferência vem ANTES da exclusão — na ordem inversa a notícia já
    // teria sido apagada quando o erro fosse lançado.
    const confirmacao = texto(corpo.confirmacao, 'confirmacao', { obrigatorio: false, max: 200 });
    const atual = await buscarNoticia(id);
    if (!atual) throw new ErroAdmin('Notícia não encontrada.', 404);

    if (confirmacao !== atual.titulo) {
      throw new ErroAdmin('Para apagar, digite o título da notícia exatamente como está escrito.');
    }

    const apagada = await apagarNoticia(id);

    await registrarAuditoria({
      adminId: sessao.id, adminNome: sessao.nome,
      acao: 'noticia_apagar', rotulo: 'Apagar notícia',
      alvoTipo: 'noticia', alvoId: id, motivo: motivo || null,
      resumo: `Notícia "${apagada.titulo}" apagada.`,
      antes: apagada, detalhes: {}, ip: ipDaRequisicao(req), resultado: 'ok'
    });

    revalidatePath('/');
    return { mensagem: `Notícia "${apagada.titulo}" apagada.` };
  }

  // ---- Criar / editar ----
  if (operacao !== 'salvar') throw new ErroAdmin('Operação inválida. Use salvar ou apagar.');

  const { noticia, criada, antes } = await salvarNoticia(
    {
      id: corpo.id ? String(corpo.id) : undefined,
      titulo: corpo.titulo,
      resumo: corpo.resumo,
      corpo: corpo.corpo,
      data: corpo.data,
      etiqueta: corpo.etiqueta,
      destaque: corpo.destaque,
      publicada: corpo.publicada
    },
    autor
  );

  await registrarAuditoria({
    adminId: sessao.id, adminNome: sessao.nome,
    acao: criada ? 'noticia_criar' : 'noticia_editar',
    rotulo: criada ? 'Criar notícia' : 'Editar notícia',
    alvoTipo: 'noticia', alvoId: noticia.id, motivo: null,
    resumo: `${criada ? 'Criada' : 'Editada'}: "${noticia.titulo}"`
      + (noticia.publicada ? '' : ' (rascunho)'),
    antes, detalhes: { destaque: noticia.destaque, publicada: noticia.publicada },
    ip: ipDaRequisicao(req), resultado: 'ok'
  });

  revalidatePath('/');
  return {
    mensagem: criada
      ? `Notícia criada${noticia.publicada ? ' e publicada' : ' como rascunho'}.`
      : 'Notícia atualizada.',
    noticia
  };
});
