import { revalidatePath } from 'next/cache';
import { rotaAdmin, ipDaRequisicao, texto, ErroAdmin } from '@/lib/admin/guarda';
import { salvarCarta, apagarCarta, buscarCarta } from '@/lib/admin/cartas';
import { registrarAuditoria } from '@/lib/admin/auditoria';

/**
 * Cadastro e edição de cartas do catálogo.
 *
 * Apagar carta é a operação mais perigosa daqui: ela some do catálogo,
 * mas as cópias que os jogadores já têm continuam no inventário deles.
 * Por isso a confirmação usa o nome da carta e a resposta diz quantos
 * jogadores ficam com registro órfão.
 */

export const dynamic = 'force-dynamic';

export const POST = rotaAdmin(async (req, sessao) => {
  const corpo = await req.json().catch(() => {
    throw new ErroAdmin('Corpo da requisição não é um JSON válido.');
  });

  const operacao = texto(corpo.operacao, 'operacao', { max: 20 });

  // ---- Apagar ----
  if (operacao === 'apagar') {
    const id = texto(corpo.id, 'id', { max: 32 });
    const motivo = texto(corpo.motivo, 'motivo', { max: 300 });
    if (motivo.length < 5) {
      throw new ErroAdmin('Descreva o motivo (pelo menos 5 caracteres). Ele fica no log de auditoria.');
    }

    const atual = await buscarCarta(id);
    if (!atual) throw new ErroAdmin('Carta não encontrada.', 404);

    const confirmacao = texto(corpo.confirmacao, 'confirmacao', { obrigatorio: false, max: 200 });
    if (confirmacao !== atual.name) {
      throw new ErroAdmin('Para apagar, digite o nome da carta exatamente como está escrito.');
    }

    const { carta, jogadoresAfetados } = await apagarCarta(id);

    await registrarAuditoria({
      adminId: sessao.id, adminNome: sessao.nome,
      acao: 'carta_apagar', rotulo: 'Apagar carta',
      alvoTipo: 'carta', alvoId: id, motivo,
      resumo: `Carta #${carta.numero ?? '???'} "${carta.name}" apagada do catálogo.`,
      antes: carta, detalhes: { jogadoresAfetados },
      ip: ipDaRequisicao(req), resultado: 'ok'
    });

    revalidatePath('/cartas');
    return {
      mensagem: `"${carta.name}" apagada do catálogo.`
        + (jogadoresAfetados > 0
          ? ` ${jogadoresAfetados} jogador(es) ainda têm essa carta no inventário ou na Pokédex — as cópias deles continuam funcionando.`
          : '')
    };
  }

  // ---- Criar / editar ----
  if (operacao !== 'salvar') throw new ErroAdmin('Operação inválida. Use salvar ou apagar.');

  const { carta, criada, antes, avisos } = await salvarCarta({
    id: corpo.id ? String(corpo.id) : undefined,
    name: corpo.name,
    series: corpo.series,
    characterImage: corpo.characterImage,
    seriesImage: corpo.seriesImage,
    baseImage: corpo.baseImage,
    rarity: corpo.rarity,
    overall: corpo.overall,
    ATA: corpo.ATA,
    LIF: corpo.LIF,
    POW: corpo.POW,
    // ⚠️ Faltavam, e o sintoma era mudo: o formulário mandava as duas
    // caixas, esta rota montava o payload campo a campo e as descartava.
    // Marcar "carta vinculada" não fazia absolutamente nada, sem erro.
    //
    // Montar o payload explicitamente é proposital (não repassar `corpo`
    // inteiro evita gravar campo que o usuário inventar), mas o preço é
    // este: campo novo precisa ser acrescentado AQUI também.
    distribuivel: corpo.distribuivel,
    comercializavel: corpo.comercializavel
  });

  await registrarAuditoria({
    adminId: sessao.id, adminNome: sessao.nome,
    acao: criada ? 'carta_criar' : 'carta_editar',
    rotulo: criada ? 'Criar carta' : 'Editar carta',
    alvoTipo: 'carta', alvoId: String(carta._id), motivo: null,
    resumo: `${criada ? 'Criada' : 'Editada'}: #${carta.numero ?? '???'} ${carta.name} (${carta.rarity})`,
    antes, detalhes: { avisos },
    ip: ipDaRequisicao(req), resultado: 'ok'
  });

  revalidatePath('/cartas');
  return {
    mensagem: criada
      ? `Carta criada com o número #${carta.numero}.`
      : 'Carta atualizada. O número da Pokédex não muda em edição.',
    avisos,
    carta: { id: String(carta._id), numero: carta.numero, name: carta.name }
  };
});
