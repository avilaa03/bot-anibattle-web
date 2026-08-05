import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ErroAdmin, texto, inteiro, idDiscord } from './guarda';
import { TIERS, calcularExpiracao, type VipDoJogador } from '@/lib/vip';
import { ORDEM_RARIDADES } from '@/lib/raridades';
import { valoresDaCarta } from '@/lib/valores';
import { existe as existeItem, getItem } from '@/lib/itens';
import { cartaNoNivel } from '@/lib/aprimoramento';
import type { Carta } from '@/lib/tipos';

/**
 * Ações administrativas sobre um jogador.
 *
 * Este arquivo é o equivalente web dos scripts `cards:grant`, `vip:grant`
 * e `pokedex:grant` do bot. As regras de negócio foram copiadas de lá de
 * propósito, e cada ponto onde isso importa está marcado com um comentário
 * "espelha X" — se o bot mudar a forma de montar uma carta, os dois
 * precisam mudar juntos, senão carta dada pelo painel fica diferente de
 * carta rolada no jogo.
 *
 * Toda função aqui devolve `{ resumo, antes, detalhes }`:
 *   - `resumo`  é o que aparece para você na tela
 *   - `antes`   é o estado anterior, gravado na auditoria para permitir desfazer
 *   - `detalhes` são os parâmetros usados, também para a auditoria
 */

const COL_JOGADORES = 'users';
const COL_CARTAS = 'new-cards';
const COL_PAGAMENTOS = 'payments';

export interface ResultadoAcao {
  resumo: string;
  antes: unknown;
  detalhes: Record<string, unknown>;
}

// ---------- Catálogo de ações ----------

export interface DefinicaoAcao {
  rotulo: string;
  perigosa: boolean;
  descricao: string;
}

export const ACOES: Record<string, DefinicaoAcao> = {
  dar_cartas: {
    rotulo: 'Dar cartas',
    perigosa: false,
    descricao: 'Entrega cópias idênticas às do /roll e registra na Pokédex.'
  },
  remover_cartas: {
    rotulo: 'Remover cartas',
    perigosa: true,
    descricao: 'Tira cartas do inventário. A Pokédex não é afetada.'
  },
  ajustar_moedas: {
    rotulo: 'Ajustar moedas',
    perigosa: false,
    descricao: 'Soma ou subtrai do saldo. Nunca deixa o saldo negativo.'
  },
  dar_vip: {
    rotulo: 'Ativar VIP',
    perigosa: false,
    descricao: 'Ativa ou renova um plano. Renovar acumula o tempo restante.'
  },
  remover_vip: {
    rotulo: 'Remover VIP',
    perigosa: true,
    descricao: 'Cancela o plano na hora, sem devolver o tempo pago.'
  },
  marcar_pokedex: {
    rotulo: 'Marcar na Pokédex',
    perigosa: false,
    descricao: 'Registra descobertas sem entregar as cartas.'
  },
  limpar_pokedex: {
    rotulo: 'Apagar a Pokédex',
    perigosa: true,
    descricao: 'Zera o registro de descobertas. Não tem como recuperar sem backup.'
  },
  banir: {
    rotulo: 'Banir',
    perigosa: true,
    descricao: 'Bloqueia todos os comandos do bot para esse jogador.'
  },
  desbanir: {
    rotulo: 'Remover banimento',
    perigosa: false,
    descricao: 'Devolve o acesso ao jogo.'
  },
  resetar: {
    rotulo: 'Resetar a conta',
    perigosa: true,
    descricao: 'Apaga inventário, moedas, Pokédex, troféus e estatísticas. VIP pago é preservado.'
  },
  ajustar_itens: {
    rotulo: 'Dar ou tirar itens',
    perigosa: false,
    descricao: 'Soma ou subtrai gemas e pergaminhos da bolsa. Nunca deixa a quantidade negativa.'
  },
  ajustar_nivel: {
    rotulo: 'Ajustar nível da carta',
    perigosa: true,
    descricao: 'Muda o nível de aprimoramento de UMA carta e recalcula atributos e preço a partir dos valores naturais.'
  },
  marcar_beta: {
    rotulo: 'Marcar/desmarcar beta',
    perigosa: false,
    descricao: 'Liga ou desliga o selo de participante da beta.'
  },
  marcar_staff: {
    rotulo: 'Marcar/desmarcar staff',
    perigosa: true,
    descricao: 'Liga ou desliga o selo de equipe.'
  }
};

/** Acima disso, dar carta vira operação perigosa e passa a exigir motivo. */
export const LIMITE_CARTAS_SEM_CONFIRMAR = 25;

export function ehPerigosa(acao: string, params: Record<string, unknown>): boolean {
  const def = ACOES[acao];
  if (!def) throw new ErroAdmin(`Ação desconhecida: "${acao}".`);
  if (def.perigosa) return true;

  // Dar 3 cartas é rotina. Dar 300 é evento — merece o mesmo cuidado de
  // uma operação destrutiva, porque infla a economia do mesmo jeito.
  if (acao === 'dar_cartas' && Number(params.quantidade) > LIMITE_CARTAS_SEM_CONFIRMAR) return true;
  if (acao === 'ajustar_moedas' && Math.abs(Number(params.delta)) > 100_000) return true;

  // Uma gema é rotina; mil gemas é o mesmo que dar dinheiro, porque gema
  // tem preço na loja. O limite acompanha o valor, não a quantidade.
  if (acao === 'ajustar_itens' && Math.abs(Number(params.delta)) > 500) return true;

  return false;
}

// ---------- Auxiliares ----------

async function exigirJogador(id: string) {
  const db = await getDb();
  const jogador = await db.collection(COL_JOGADORES).findOne({ id });
  if (!jogador) {
    throw new ErroAdmin(
      `Nenhum jogador com o ID ${id}. Ele precisa ter usado o bot pelo menos uma vez.`,
      404
    );
  }
  return jogador;
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Monta a cópia da carta que vai para o inventário.
 *
 * Espelha `montarCopia` em scripts/grantCards.js, que por sua vez espelha
 * o rollCollect.js. Se um mudar, os três mudam.
 *
 * ⚠️ E foi exatamente isso que não aconteceu. Quando a fórmula do preço
 * passou a depender da raridade, o bot mudou e estes dois ficaram para
 * trás: o painel continuou entregando Mestra a 950 em vez de 190.500. O
 * preço fica GRAVADO na cópia, então não era só a tela errada — cada
 * "dar cartas" criava acervo com a tabela velha, inclusive depois da
 * migração ter arrumado o resto.
 *
 * O `valores.ts` existe para isto: um lugar só, espelhando o do bot.
 */
function montarCopia(carta: Carta) {
  const { marketValue, valueToSell } = valoresDaCarta(carta);
  return {
    // ⚠️ O `_id` PRECISA estar aqui, e é fácil achar que não.
    //
    // O bot usa Mongoose, que gera `_id` sozinho para cada item de array
    // de subdocumento. Aqui usamos o driver nativo, que NÃO gera — e o
    // documento entra no banco sem `_id`.
    //
    // O estrago aparece longe daqui: a escolha de cartas na batalha, a
    // mesa de troca e o inventário identificam a cópia por `card._id`
    // (não por `cardId`). Sem ele, a carta aparece na lista mas o botão
    // devolve "essa carta não está mais no seu inventário" — foi
    // exatamente o bug relatado com cartas dadas pelo painel.
    //
    // Cartas dadas pelo script `npm run cards:grant` não tinham o
    // problema porque aquele script passa por Mongoose.
    _id: new ObjectId(),
    cardId: new ObjectId(),
    originalCardId: carta._id,
    name: carta.name,
    series: carta.series,
    seriesImage: carta.seriesImage ?? '',
    baseImage: carta.baseImage ?? '',
    characterImage: carta.characterImage,
    rarity: carta.rarity,
    overall: carta.overall,
    ATA: carta.ATA,
    LIF: carta.LIF,
    POW: carta.POW,
    obtainedAt: new Date(),
    marketValue,
    valueToSell
  };
}

/** Monta o filtro do catálogo a partir do escopo escolhido na tela. */
function filtroDoCatalogo(params: Record<string, unknown>): Record<string, unknown> {
  const escopo = texto(params.escopo, 'escopo', { max: 20 });

  if (escopo === 'carta') {
    const id = texto(params.cartaId, 'cartaId', { max: 32 });
    if (!ObjectId.isValid(id)) throw new ErroAdmin(`"${id}" não é um ID de carta válido.`);
    return { _id: new ObjectId(id) };
  }
  if (escopo === 'raridade') {
    const r = texto(params.raridade, 'raridade', { max: 20 }).toLowerCase();
    if (!ORDEM_RARIDADES.includes(r)) throw new ErroAdmin(`Raridade "${r}" não existe.`);
    return { rarity: r };
  }
  if (escopo === 'serie') {
    const s = texto(params.serie, 'serie', { max: 120 });
    return { series: { $regex: escaparRegex(s), $options: 'i' } };
  }
  if (escopo === 'tudo') {
    return {};
  }
  throw new ErroAdmin('Escopo inválido. Use carta, raridade, serie ou tudo.');
}

// ---------- Cartas ----------

async function darCartas(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const quantidade = inteiro(params.quantidade, 'quantidade', { min: 1, max: 500, padrao: 1 });
  const comPokedex = params.comPokedex !== false;
  const filtro = filtroDoCatalogo(params);

  if (Object.keys(filtro).length === 0) {
    throw new ErroAdmin('Escolha uma carta, uma raridade ou uma série. "Tudo" não vale para dar cartas.');
  }

  const cartas = db.collection<Carta>(COL_CARTAS);
  let escolhidas: Carta[];

  if ('_id' in filtro) {
    const carta = await cartas.findOne(filtro);
    if (!carta) throw new ErroAdmin('Carta não encontrada no catálogo.', 404);
    escolhidas = Array(quantidade).fill(carta);
  } else {
    // Sem carta específica: sorteia do conjunto filtrado, como um /roll.
    const amostra = await cartas.aggregate<Carta>([
      { $match: filtro },
      { $sample: { size: quantidade } }
    ]).toArray();
    if (amostra.length === 0) throw new ErroAdmin('Nenhuma carta do catálogo bate com esse filtro.', 404);
    // $sample não repete: se pediram mais do que existe, ciclamos.
    escolhidas = Array.from({ length: quantidade }, (_, i) => amostra[i % amostra.length]);
  }

  const copias = escolhidas.map(montarCopia);
  const atualizacao: Record<string, unknown> = { $push: { inventory: { $each: copias } } };

  // Mesmo comportamento do /roll: primeira carta vira a favorita.
  if (!jogador.favCard && copias.length > 0) {
    atualizacao.$set = { favCard: copias[0].cardId };
  }

  await db.collection(COL_JOGADORES).updateOne({ id: alvo }, atualizacao);

  let ineditas = 0;
  if (comPokedex) {
    const idsUnicos = [...new Set(escolhidas.map((c) => String(c._id)))];
    for (const id of idsUnicos) {
      const oid = new ObjectId(id);
      // A condição no filtro é o que garante que não duplica: se a carta
      // já está descoberta, o update simplesmente não casa com nada.
      const registro: Record<string, unknown> = {
        $push: { discovered: { cardId: oid, firstObtainedAt: new Date() } }
      };
      const r = await db.collection(COL_JOGADORES).updateOne(
        { id: alvo, 'discovered.cardId': { $ne: oid } },
        registro
      );
      if (r.modifiedCount > 0) ineditas++;
    }
  }

  const contagem = new Map<string, number>();
  for (const c of copias) contagem.set(c.name, (contagem.get(c.name) || 0) + 1);
  const lista = [...contagem.entries()].map(([n, q]) => `${q}x ${n}`).join(', ');

  return {
    resumo: `${copias.length} carta(s) entregue(s): ${lista}.`
      + (comPokedex ? ` ${ineditas} descoberta(s) inédita(s).` : ' Pokédex não alterada.'),
    antes: { totalInventario: (jogador.inventory as unknown[])?.length ?? 0 },
    detalhes: { quantidade, comPokedex, filtro: JSON.stringify(filtro), ineditas }
  };
}

async function removerCartas(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const inventario = (jogador.inventory as Record<string, unknown>[]) || [];

  // Remoção de uma entrada exata do inventário (o caminho seguro, usado
  // pela lista de cartas na tela do jogador).
  const inventoryId = texto(params.inventoryId, 'inventoryId', { obrigatorio: false, max: 32 });

  let restante: Record<string, unknown>[];
  let removidas: Record<string, unknown>[];

  if (inventoryId) {
    if (!ObjectId.isValid(inventoryId)) throw new ErroAdmin('ID de inventário inválido.');
    removidas = inventario.filter((c) => String(c.cardId) === inventoryId);
    if (removidas.length === 0) throw new ErroAdmin('Essa carta não está no inventário do jogador.', 404);
    restante = inventario.filter((c) => String(c.cardId) !== inventoryId);
  } else {
    const quantidade = inteiro(params.quantidade, 'quantidade', { min: 1, max: 500, padrao: 1 });
    const cartaId = texto(params.cartaId, 'cartaId', { max: 32 });
    if (!ObjectId.isValid(cartaId)) throw new ErroAdmin('Escolha qual carta remover.');

    removidas = [];
    restante = [];
    for (const c of inventario) {
      if (String(c.originalCardId) === cartaId && removidas.length < quantidade) {
        removidas.push(c);
      } else {
        restante.push(c);
      }
    }
    if (removidas.length === 0) throw new ErroAdmin('O jogador não tem nenhuma cópia dessa carta.', 404);
  }

  const atualizacao: Record<string, unknown> = { $set: { inventory: restante } };

  // Se a favorita foi embora, a referência ficaria apontando para o nada.
  const favoritaRemovida = removidas.some((c) => String(c.cardId) === String(jogador.favCard));
  if (favoritaRemovida) {
    (atualizacao.$set as Record<string, unknown>).favCard = restante[0]?.cardId ?? null;
  }

  await db.collection(COL_JOGADORES).updateOne({ id: alvo }, atualizacao);

  return {
    resumo: `${removidas.length} carta(s) removida(s): `
      + `${removidas.map((c) => c.name).join(', ')}. `
      + 'A Pokédex não foi alterada — descoberta é permanente.',
    antes: { removidas },
    detalhes: { inventarioAntes: inventario.length, inventarioDepois: restante.length }
  };
}

// ---------- Moedas ----------

async function ajustarMoedas(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const delta = inteiro(params.delta, 'delta', { min: -10_000_000, max: 10_000_000 });
  if (delta === 0) throw new ErroAdmin('Informe um valor diferente de zero.');

  // Update por pipeline: soma e trava no zero numa operação atômica só,
  // sem janela entre ler e gravar em que outro comando do bot poderia
  // mexer no saldo.
  const resultado = await db.collection(COL_JOGADORES).findOneAndUpdate(
    { id: alvo },
    [{ $set: { balance: { $max: [0, { $add: [{ $ifNull: ['$balance', 0] }, delta] }] } } }],
    { returnDocument: 'after' }
  );

  const saldoAntes = (jogador.balance as number) ?? 0;
  const saldoDepois = (resultado?.balance as number) ?? 0;

  return {
    resumo: `Saldo: ${saldoAntes.toLocaleString('pt-BR')} → ${saldoDepois.toLocaleString('pt-BR')} moedas.`,
    antes: { balance: saldoAntes },
    detalhes: { delta, saldoDepois }
  };
}

// ---------- VIP ----------

async function darVip(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const tierKey = texto(params.tier, 'tier', { max: 20 }).toLowerCase();
  const tier = TIERS[tierKey];
  if (!tier) throw new ErroAdmin(`Plano "${tierKey}" não existe.`);

  const meses = inteiro(params.meses, 'meses', { min: 1, max: 120, padrao: 1 });
  const vipAntes = (jogador.vip as VipDoJogador) ?? null;
  const expiresAt = calcularExpiracao(vipAntes, meses);

  // Idempotência igual à do webhook: o mesmo pagamento nunca concede duas
  // vezes. Aqui o "pagamento" é a própria operação do painel, então o id
  // carrega quem fez e quando.
  const idPagamento = texto(params.idPagamento, 'idPagamento', { obrigatorio: false, max: 100 })
    || `painel-${alvo}-${Date.now()}`;

  const jaProcessado = await db.collection(COL_PAGAMENTOS).findOne({ providerPaymentId: idPagamento });
  if (jaProcessado) {
    return {
      resumo: `Pagamento "${idPagamento}" já tinha sido processado. Nada foi alterado.`,
      antes: { vip: vipAntes },
      detalhes: { duplicado: true, idPagamento }
    };
  }

  const set: Record<string, unknown> = { 'vip.tier': tierKey, 'vip.expiresAt': expiresAt };
  if (!vipAntes?.since) set['vip.since'] = new Date();

  await db.collection(COL_JOGADORES).updateOne({ id: alvo }, { $set: set });

  await db.collection(COL_PAGAMENTOS).insertOne({
    providerPaymentId: idPagamento,
    provider: 'painel',
    discordUserId: alvo,
    tier: tierKey,
    meses,
    valorBRL: tier.precoBRL * meses,
    status: 'aprovado',
    processadoEm: new Date(),
    payloadBruto: { origem: 'painel-admin' }
  }).catch((err) => {
    // Índice único barrando corrida: o VIP já foi concedido, seguimos.
    if (err?.code !== 11000) throw err;
  });

  return {
    resumo: `${tier.emoji} VIP ${tier.nome} por ${meses} mês(es). `
      + `Expira em ${expiresAt.toLocaleDateString('pt-BR')}.`,
    antes: { vip: vipAntes },
    detalhes: { tier: tierKey, meses, expiresAt, idPagamento }
  };
}

async function removerVip(alvo: string): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const vipAntes = (jogador.vip as VipDoJogador) ?? null;

  if (!vipAntes?.tier) throw new ErroAdmin('Esse jogador não tem VIP ativo.');

  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo },
    { $set: { 'vip.tier': null, 'vip.expiresAt': null } }
  );

  return {
    resumo: `VIP ${vipAntes.tier} removido.`,
    antes: { vip: vipAntes },
    detalhes: {}
  };
}

// ---------- Pokédex ----------

async function marcarPokedex(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const filtro = filtroDoCatalogo(params);

  const cartas = await db.collection<Carta>(COL_CARTAS)
    .find(filtro).project({ _id: 1 }).toArray();
  if (cartas.length === 0) throw new ErroAdmin('Nenhuma carta do catálogo bate com esse filtro.', 404);

  const jaTem = new Set(
    ((jogador.discovered as { cardId: ObjectId }[]) || []).map((d) => String(d.cardId))
  );
  const faltando = cartas.filter((c) => !jaTem.has(String(c._id)));

  if (faltando.length === 0) {
    return {
      resumo: 'Nada a fazer — o jogador já descobriu todas essas cartas.',
      antes: { descobertas: jaTem.size },
      detalhes: { filtro: JSON.stringify(filtro) }
    };
  }

  // Em lotes: um $push com 20 mil itens estoura o limite de 16 MB do
  // documento na hora de montar a operação.
  const agora = new Date();
  const LOTE = 500;
  for (let i = 0; i < faltando.length; i += LOTE) {
    const lote: Record<string, unknown> = {
      $push: {
        discovered: {
          $each: faltando.slice(i, i + LOTE).map((c) => ({ cardId: c._id, firstObtainedAt: agora }))
        }
      }
    };
    await db.collection(COL_JOGADORES).updateOne({ id: alvo }, lote);
  }

  return {
    resumo: `${faltando.length} carta(s) marcada(s) como descoberta(s). `
      + `Pokédex: ${jaTem.size} → ${jaTem.size + faltando.length}. O jogador NÃO recebeu as cartas.`,
    antes: { descobertas: jaTem.size },
    detalhes: { marcadas: faltando.length, filtro: JSON.stringify(filtro) }
  };
}

async function limparPokedex(alvo: string): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const antes = (jogador.discovered as unknown[]) || [];

  if (antes.length === 0) throw new ErroAdmin('A Pokédex desse jogador já está vazia.');

  await db.collection(COL_JOGADORES).updateOne({ id: alvo }, { $set: { discovered: [] } });

  return {
    // O estado anterior inteiro vai para a auditoria — é o que permite
    // restaurar sem precisar recorrer ao backup.
    resumo: `Pokédex zerada: ${antes.length} descoberta(s) apagada(s).`,
    antes: { discovered: antes },
    detalhes: { apagadas: antes.length }
  };
}

// ---------- Moderação ----------

async function banir(alvo: string, params: Record<string, unknown>, motivo: string, adminId: string): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const dias = inteiro(params.dias, 'dias', { min: 0, max: 3650, padrao: 0 });
  const expiraEm = dias > 0 ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000) : null;

  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo },
    {
      $set: {
        'banimento.ativo': true,
        'banimento.motivo': motivo,
        'banimento.aplicadoEm': new Date(),
        'banimento.aplicadoPor': adminId,
        'banimento.expiraEm': expiraEm
      }
    }
  );

  return {
    resumo: dias > 0
      ? `Suspenso por ${dias} dia(s), até ${expiraEm!.toLocaleString('pt-BR')}. `
        + 'O bot passa a bloquear em até 30 segundos.'
      : 'Suspenso permanentemente. O bot passa a bloquear em até 30 segundos.',
    antes: { banimento: jogador.banimento ?? null },
    detalhes: { dias, expiraEm }
  };
}

async function desbanir(alvo: string): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);
  const antes = jogador.banimento as Record<string, unknown> | undefined;

  if (!antes?.ativo) throw new ErroAdmin('Esse jogador não está banido.');

  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo },
    { $set: { 'banimento.ativo': false, 'banimento.expiraEm': null } }
  );

  return {
    resumo: 'Banimento removido. O jogador volta a jogar em até 30 segundos.',
    antes: { banimento: antes },
    detalhes: {}
  };
}

// ---------- Reset ----------

async function resetar(alvo: string): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  // O que NÃO é apagado, e por quê:
  //   vip       — foi pago com dinheiro real. Apagar junto seria calote.
  //   banimento — resetar não pode virar caminho para escapar da punição.
  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo },
    {
      $set: {
        inventory: [],
        discovered: [],
        wishlist: [],
        conquistas: [],
        balance: 0,
        wins: 0,
        losses: 0,
        elo: 1000,
        picoElo: 1000,
        favCard: null,
        lastRoll: 0,
        lastDaily: null,
        streak: { atual: 0, maior: 0, ultimoDia: null },
        stats: {
          rolls: 0, batalhasVencidas: 0, batalhasPerdidas: 0, trocasFeitas: 0,
          vendasMercado: 0, comprasMercado: 0, moedasGanhas: 0, moedasGastas: 0,
          criticos: 0, viradas: 0, torneiosVencidos: 0, diasAtivos: 0
        },
        missoes: { diarias: [], semanais: [], diaGerado: null, semanaGerada: null }
      }
    }
  );

  return {
    resumo: 'Conta resetada. VIP e banimento foram preservados de propósito.',
    // O documento inteiro vai para a auditoria: é a única forma de
    // desfazer um reset feito por engano.
    antes: jogador,
    detalhes: {
      inventarioApagado: (jogador.inventory as unknown[])?.length ?? 0,
      descobertasApagadas: (jogador.discovered as unknown[])?.length ?? 0,
      saldoApagado: jogador.balance ?? 0
    }
  };
}

// ---------- Itens da bolsa ----------

/**
 * Soma ou subtrai um item da bolsa.
 *
 * ## A escrita é atômica, e isso não é preciosismo
 *
 * O filtro carrega o `$gte` quando o delta é negativo, então o Mongo só
 * aplica se ainda houver saldo no instante EXATO da escrita. Ler antes e
 * conferir no Node deixa uma janela: dois pedidos simultâneos leriam "10
 * gemas" e os dois tirariam 10, deixando -10.
 *
 * É a mesma regra que o `/loja` do bot segue (ver `utils/bolsa.js`).
 *
 * ## Item não vira moeda
 *
 * Dar gema é dar poder de aprimoramento, não dinheiro. Por isso esta ação
 * NÃO mexe em saldo e não existe "converter gema em moeda" — com caminho
 * de volta, a diferença entre comprar e converter vira renda infinita.
 */
async function ajustarItens(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const chave = texto(params.item, 'item', { max: 40 }).toLowerCase();
  if (!existeItem(chave)) {
    throw new ErroAdmin(`Item "${chave}" não existe no catálogo. Use um dos itens da bolsa.`);
  }

  const delta = inteiro(params.delta, 'delta', { min: -100_000, max: 100_000 });
  if (delta === 0) throw new ErroAdmin('Informe uma quantidade diferente de zero.');

  const item = getItem(chave)!;
  const campo = `bolsa.${chave}`;
  const bolsaAtual = (jogador.bolsa as Record<string, unknown>) || {};
  const antes = Number(bolsaAtual[chave] ?? 0);

  const filtro: Record<string, unknown> = { id: alvo };
  if (delta < 0) filtro[campo] = { $gte: Math.abs(delta) };

  const resultado = await db.collection(COL_JOGADORES).updateOne(filtro, { $inc: { [campo]: delta } });

  if (resultado.matchedCount === 0) {
    throw new ErroAdmin(
      `${jogador.id} tem ${antes} ${item.nome}, e você tentou tirar ${Math.abs(delta)}. `
      + 'A bolsa nunca fica negativa.'
    );
  }

  const verbo = delta > 0 ? 'Adicionou' : 'Removeu';
  return {
    resumo: `${verbo} ${Math.abs(delta)} ${item.emoji} ${item.nome} (de ${antes} para ${antes + delta}).`,
    antes: { [chave]: antes },
    detalhes: { item: chave, delta }
  };
}

// ---------- Aprimoramento ----------

/**
 * Ajusta o nível de UMA carta do inventário.
 *
 * ## Por que o painel edita nível, e não atributo
 *
 * O bot recalcula ATA/LIF/POW **sempre a partir dos valores naturais**
 * (`base`), nunca do valor já aprimorado. Se o painel deixasse editar
 * `overall` direto, a carta ficaria com atributos que não correspondem a
 * `base + nivel` — e o estrago só apareceria no `/aprimorar` SEGUINTE,
 * quando o bot recalculasse tudo e os números do jogador mudassem sozinhos.
 *
 * Mexer no nível e deixar `cartaNoNivel()` derivar o resto é a única forma
 * de a carta continuar coerente. Por isso esta ação também GRAVA `base`
 * quando ela não existe: carta anterior ao aprimoramento não tem o campo,
 * e sem ele o primeiro ajuste perderia os valores naturais para sempre.
 */
async function ajustarNivel(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const inventarioId = texto(params.inventarioId, 'inventarioId', { max: 32 });
  if (!ObjectId.isValid(inventarioId)) {
    throw new ErroAdmin(`"${inventarioId}" não é um ID de carta válido.`);
  }

  const novoNivel = inteiro(params.nivel, 'nivel', { min: 0, max: 100 });

  const inventario = (jogador.inventory as Record<string, unknown>[]) || [];
  const indice = inventario.findIndex((c) => String(c._id) === inventarioId);
  if (indice < 0) {
    throw new ErroAdmin('Essa carta não está no inventário desse jogador.', 404);
  }

  const carta = inventario[indice];
  const nivelAntes = Number(carta.nivel ?? 0);
  const calculada = cartaNoNivel(carta, novoNivel);

  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo, 'inventory._id': new ObjectId(inventarioId) },
    {
      $set: {
        'inventory.$.nivel': calculada.nivel,
        'inventory.$.overall': calculada.overall,
        'inventory.$.ATA': calculada.ATA,
        'inventory.$.LIF': calculada.LIF,
        'inventory.$.POW': calculada.POW,
        'inventory.$.marketValue': calculada.marketValue,
        'inventory.$.valueToSell': calculada.valueToSell,
        // Grava os naturais se a carta ainda não os tinha. Sem isto, o
        // primeiro ajuste passaria a tratar o valor JÁ aprimorado como
        // natural, e a carta nunca mais voltaria ao overall de origem.
        'inventory.$.base': calculada.base
      }
    }
  );

  return {
    resumo:
      `${String(carta.name ?? 'Carta')}: nível ${nivelAntes} → ${calculada.nivel} `
      + `(overall ${Number(carta.overall ?? 0)} → ${calculada.overall}).`,
    antes: {
      nivel: nivelAntes,
      overall: Number(carta.overall ?? 0),
      ATA: Number(carta.ATA ?? 0),
      LIF: Number(carta.LIF ?? 0),
      POW: Number(carta.POW ?? 0),
      marketValue: Number(carta.marketValue ?? 0),
      valueToSell: Number(carta.valueToSell ?? 0),
      base: carta.base ?? null
    },
    detalhes: { inventarioId, nivel: novoNivel }
  };
}

// ---------- Selos ----------

async function marcarBeta(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const ligar = params.ligar !== false;
  const beta = (jogador.beta as Record<string, unknown>) || {};
  const antes = Boolean(beta.participou);

  if (antes === ligar) {
    throw new ErroAdmin(`O selo de beta já está ${ligar ? 'ligado' : 'desligado'} para esse jogador.`);
  }

  await db.collection(COL_JOGADORES).updateOne(
    { id: alvo },
    ligar
      ? {
        $set: {
          'beta.participou': true,
          'beta.marcadoEm': new Date(),
          // Fotografia auditável: daqui a um ano, é o que explica por que
          // esse jogador recebeu a carta da beta.
          'beta.rollsNaEpoca': Number((jogador.stats as Record<string, unknown>)?.rolls ?? 0)
        }
      }
      : { $set: { 'beta.participou': false } }
  );

  return {
    resumo: ligar ? 'Marcado como participante da beta.' : 'Selo de beta removido.',
    antes: { participou: antes },
    detalhes: { ligar }
  };
}

async function marcarStaff(alvo: string, params: Record<string, unknown>): Promise<ResultadoAcao> {
  const db = await getDb();
  const jogador = await exigirJogador(alvo);

  const ligar = params.ligar !== false;
  const antes = Boolean(jogador.staff);

  if (antes === ligar) {
    throw new ErroAdmin(`O selo de staff já está ${ligar ? 'ligado' : 'desligado'} para esse jogador.`);
  }

  await db.collection(COL_JOGADORES).updateOne({ id: alvo }, { $set: { staff: ligar } });

  return {
    resumo: ligar ? 'Marcado como staff.' : 'Selo de staff removido.',
    antes: { staff: antes },
    detalhes: { ligar }
  };
}

// ---------- Despachante ----------

export async function executarAcaoJogador(opcoes: {
  acao: string;
  alvo: string;
  params: Record<string, unknown>;
  motivo: string;
  adminId: string;
}): Promise<ResultadoAcao> {
  const { acao, alvo, params, motivo, adminId } = opcoes;

  switch (acao) {
    case 'dar_cartas': return darCartas(alvo, params);
    case 'remover_cartas': return removerCartas(alvo, params);
    case 'ajustar_moedas': return ajustarMoedas(alvo, params);
    case 'dar_vip': return darVip(alvo, params);
    case 'remover_vip': return removerVip(alvo);
    case 'marcar_pokedex': return marcarPokedex(alvo, params);
    case 'limpar_pokedex': return limparPokedex(alvo);
    case 'banir': return banir(alvo, params, motivo, adminId);
    case 'desbanir': return desbanir(alvo);
    case 'resetar': return resetar(alvo);
    case 'ajustar_itens': return ajustarItens(alvo, params);
    case 'ajustar_nivel': return ajustarNivel(alvo, params);
    case 'marcar_beta': return marcarBeta(alvo, params);
    case 'marcar_staff': return marcarStaff(alvo, params);
    default:
      throw new ErroAdmin(`Ação desconhecida: "${acao}".`);
  }
}

/**
 * Valida a trava das operações perigosas.
 *
 * Exigir que você redigite o ID resolve o erro mais provável do painel,
 * que não é invasão: é banir o jogador errado porque a linha de cima da
 * tabela estava selecionada. E o motivo obrigatório é o que transforma o
 * log de auditoria em algo útil daqui a três meses.
 */
export function validarConfirmacao(
  acao: string,
  alvo: string,
  corpo: Record<string, unknown>
): string {
  const params = (corpo.params as Record<string, unknown>) || {};
  const motivo = texto(corpo.motivo, 'motivo', { obrigatorio: false, max: 300 });

  if (!ehPerigosa(acao, params)) return motivo;

  const confirmacao = texto(corpo.confirmacao, 'confirmacao', { obrigatorio: false, max: 32 });
  if (confirmacao !== alvo) {
    throw new ErroAdmin(
      'Para confirmar, digite o ID do jogador exatamente como ele aparece na tela.'
    );
  }
  if (motivo.length < 5) {
    throw new ErroAdmin('Descreva o motivo (pelo menos 5 caracteres). Ele fica no log de auditoria.');
  }

  return motivo;
}

export { idDiscord };
