import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { ErroAdmin, texto, inteiro } from './guarda';
import { ORDEM_RARIDADES } from '@/lib/raridades';
import type { Carta } from '@/lib/tipos';

/**
 * Cadastro de cartas pelo painel.
 *
 * Complementa (não substitui) os scripts do bot: para importar 500 cartas
 * de uma vez o caminho continua sendo `npm run import:anilist`. Aqui é
 * para o uso avulso — cadastrar uma carta nova, corrigir um atributo que
 * saiu errado, trocar a imagem que quebrou.
 *
 * ## Numeração
 *
 * O número da Pokédex é atribuído na criação, sempre o próximo livre, e
 * NUNCA muda depois. Essa regra é a mesma do bot (ver dexNumbers.js) e
 * existe porque a carta #042 precisa continuar sendo a #042 amanhã — a
 * `/ficha` e a `/pokedex` do jogador dependem disso.
 *
 * ## Faixas por raridade
 *
 * Espelham STAT_RANGES de scripts/seedCards.js. Servem só de sugestão na
 * tela e de aviso quando um valor sai muito fora — não bloqueiam, porque
 * uma carta de evento pode ser propositalmente atípica.
 */

const COL_CARTAS = 'new-cards';

export const FAIXAS: Record<string, { overall: [number, number]; ATA: [number, number]; LIF: [number, number]; POW: [number, number] }> = {
  common: { overall: [30, 55], ATA: [20, 50], LIF: [60, 100], POW: [20, 50] },
  rare: { overall: [50, 65], ATA: [45, 65], LIF: [90, 130], POW: [45, 65] },
  'ultra rare': { overall: [62, 78], ATA: [60, 80], LIF: [120, 160], POW: [60, 80] },
  legendary: { overall: [75, 90], ATA: [75, 95], LIF: [150, 190], POW: [75, 95] },
  master: { overall: [88, 99], ATA: [90, 99], LIF: [180, 220], POW: [90, 99] }
};

/** Maior número já usado. Cartas removidas não devolvem o número. */
async function proximoNumero(): Promise<number> {
  const db = await getDb();
  const ultima = await db.collection<Carta>(COL_CARTAS)
    .find({ numero: { $ne: null } })
    .sort({ numero: -1 })
    .limit(1)
    .project({ numero: 1 })
    .toArray();
  return ((ultima[0]?.numero as number) || 0) + 1;
}

function validarUrl(valor: unknown, campo: string, obrigatorio = true): string {
  const s = texto(valor, campo, { obrigatorio, max: 600 });
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) {
    throw new ErroAdmin(`"${campo}" precisa ser uma URL começando com http:// ou https://`);
  }
  return s;
}

export interface EntradaCarta {
  id?: string;
  name: unknown;
  series: unknown;
  characterImage: unknown;
  seriesImage?: unknown;
  baseImage?: unknown;
  rarity: unknown;
  overall: unknown;
  ATA: unknown;
  LIF: unknown;
  POW: unknown;
}

export async function salvarCarta(entrada: EntradaCarta): Promise<{
  carta: Carta;
  criada: boolean;
  antes: Carta | null;
  avisos: string[];
}> {
  const db = await getDb();
  const colecao = db.collection<Carta>(COL_CARTAS);

  const rarity = texto(entrada.rarity, 'raridade', { max: 20 }).toLowerCase();
  if (!ORDEM_RARIDADES.includes(rarity)) {
    throw new ErroAdmin(`Raridade "${rarity}" não existe. Use: ${ORDEM_RARIDADES.join(', ')}.`);
  }

  const dados = {
    name: texto(entrada.name, 'nome', { max: 120 }),
    series: texto(entrada.series, 'série', { max: 120 }),
    characterImage: validarUrl(entrada.characterImage, 'imagem do personagem'),
    seriesImage: validarUrl(entrada.seriesImage, 'imagem da série', false),
    baseImage: validarUrl(entrada.baseImage, 'imagem de fundo', false),
    rarity,
    overall: inteiro(entrada.overall, 'overall', { min: 1, max: 100, padrao: 50 }),
    ATA: inteiro(entrada.ATA, 'ATA', { min: 1, max: 300, padrao: 50 }),
    LIF: inteiro(entrada.LIF, 'LIF', { min: 1, max: 999, padrao: 100 }),
    POW: inteiro(entrada.POW, 'POW', { min: 1, max: 300, padrao: 50 })
  };

  // Avisos, não erros: uma carta de evento pode sair da faixa de propósito.
  const avisos: string[] = [];
  const faixa = FAIXAS[rarity];
  if (faixa) {
    for (const campo of ['overall', 'ATA', 'LIF', 'POW'] as const) {
      const valor = dados[campo];
      const [min, max] = faixa[campo];
      if (valor < min || valor > max) {
        avisos.push(`${campo} = ${valor} está fora da faixa de "${rarity}" (${min}–${max}). Confira se é proposital.`);
      }
    }
  }
  if (dados.POW === 0) {
    avisos.push('POW zero deixa a carta incapaz de causar dano — a batalha termina por limite de turnos.');
  }

  // ---- Edição ----
  if (entrada.id) {
    if (!ObjectId.isValid(String(entrada.id))) throw new ErroAdmin('ID de carta inválido.');
    const _id = new ObjectId(String(entrada.id));

    const anterior = await colecao.findOne({ _id });
    if (!anterior) throw new ErroAdmin('Carta não encontrada.', 404);

    // `numero` fica de fora do $set de propósito: renumerar quebraria a
    // Pokédex de todo mundo que já registrou essa carta.
    await colecao.updateOne({ _id }, { $set: dados });
    const atualizada = await colecao.findOne({ _id });

    return { carta: atualizada as Carta, criada: false, antes: anterior, avisos };
  }

  // ---- Criação ----
  const duplicada = await colecao.findOne({ name: dados.name, series: dados.series });
  if (duplicada) {
    throw new ErroAdmin(
      `Já existe "${dados.name}" da série "${dados.series}" no catálogo (#${duplicada.numero ?? '???'}). `
      + 'Edite a carta existente em vez de criar outra.'
    );
  }

  const numero = await proximoNumero();
  const doc = { ...dados, numero };

  const resultado = await colecao.insertOne(doc as Carta);
  return {
    carta: { ...doc, _id: resultado.insertedId } as Carta,
    criada: true,
    antes: null,
    avisos
  };
}

export async function apagarCarta(id: string): Promise<{ carta: Carta; jogadoresAfetados: number }> {
  if (!ObjectId.isValid(id)) throw new ErroAdmin('ID de carta inválido.');
  const db = await getDb();
  const _id = new ObjectId(id);

  const carta = await db.collection<Carta>(COL_CARTAS).findOne({ _id });
  if (!carta) throw new ErroAdmin('Carta não encontrada.', 404);

  // Apagar do catálogo NÃO tira a carta de quem já tem: as cópias no
  // inventário são independentes. Mas o registro na Pokédex passa a
  // apontar para o nada, então avisamos quantas pessoas são afetadas.
  const jogadoresAfetados = await db.collection('users').countDocuments({
    $or: [{ 'discovered.cardId': _id }, { 'inventory.originalCardId': _id }]
  });

  await db.collection<Carta>(COL_CARTAS).deleteOne({ _id });

  return { carta, jogadoresAfetados };
}

export async function buscarCarta(id: string): Promise<Carta | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection<Carta>(COL_CARTAS).findOne({ _id: new ObjectId(id) });
}
