import { rotaAdmin, ipDaRequisicao, idDiscord, texto, ErroAdmin } from '@/lib/admin/guarda';
import { ACOES, executarAcaoJogador, validarConfirmacao } from '@/lib/admin/acoes';
import { registrarAuditoria } from '@/lib/admin/auditoria';

/**
 * Todas as ações sobre um jogador entram por aqui.
 *
 * Uma rota só, com um campo `acao`, em vez de dez rotas parecidas: assim
 * a auditoria e as travas de confirmação ficam num lugar só e não tem
 * como uma rota nova nascer sem elas.
 *
 * A auditoria grava TAMBÉM as tentativas que falham. Uma sequência de
 * erros de permissão é exatamente o rastro que um ataque deixa, e é o
 * tipo de coisa que some se você só registra sucesso.
 */

export const dynamic = 'force-dynamic';

export const POST = rotaAdmin(async (req, sessao) => {
  const corpo = await req.json().catch(() => {
    throw new ErroAdmin('Corpo da requisição não é um JSON válido.');
  });

  const acao = texto(corpo.acao, 'acao', { max: 40 });
  const definicao = ACOES[acao];
  if (!definicao) throw new ErroAdmin(`Ação desconhecida: "${acao}".`);

  const alvo = idDiscord(corpo.alvo, 'alvo');
  const params = (corpo.params as Record<string, unknown>) || {};

  // Trava das operações perigosas: redigitar o ID e explicar o motivo.
  const motivo = validarConfirmacao(acao, alvo, { ...corpo, params });

  const comum = {
    adminId: sessao.id,
    adminNome: sessao.nome,
    acao,
    rotulo: definicao.rotulo,
    alvoTipo: 'jogador' as const,
    alvoId: alvo,
    motivo: motivo || null,
    ip: ipDaRequisicao(req)
  };

  try {
    const resultado = await executarAcaoJogador({
      acao, alvo, params, motivo, adminId: sessao.id
    });

    await registrarAuditoria({
      ...comum,
      resumo: resultado.resumo,
      antes: resultado.antes,
      detalhes: resultado.detalhes,
      resultado: 'ok'
    });

    return { mensagem: resultado.resumo };
  } catch (err) {
    await registrarAuditoria({
      ...comum,
      resumo: 'A operação falhou e nada foi alterado.',
      antes: null,
      detalhes: { params },
      resultado: 'erro',
      erro: err instanceof Error ? err.message : 'desconhecido'
    });
    throw err;
  }
});
