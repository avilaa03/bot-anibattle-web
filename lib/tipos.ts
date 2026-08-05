import type { ObjectId } from 'mongodb';
import { valoresDaCarta } from './valores';

/**
 * Tipos das coleções do bot.
 *
 * Espelham os schemas em `bot_animefight/Commands/utils/*Schema.js`.
 * Se um schema mudar lá, atualize aqui — o TypeScript não consegue
 * adivinhar sozinho porque o bot é JavaScript puro.
 */

export type Raridade = 'common' | 'rare' | 'ultra rare' | 'legendary' | 'master';

/** Coleção `new-cards` — o catálogo. */
export interface Carta {
  _id: ObjectId;
  numero: number | null;
  name: string;
  series: string;
  seriesImage?: string;
  baseImage?: string;
  characterImage: string;
  rarity: Raridade | string;
  overall: number;
  ATA: number;
  LIF: number;
  POW: number;
  /** 'roll' (catálogo normal) ou 'evento' (distribuída à mão). */
  origem?: string;
  /** Sai em sorteio? Carta de evento entra com false. */
  distribuivel?: boolean;
  /** Pode ser vendida, trocada ou transferida? */
  comercializavel?: boolean;
}

/** Versão serializável, para passar de Server Component para o cliente. */
export interface CartaSimples {
  id: string;
  numero: number | null;
  nome: string;
  serie: string;
  imagem: string;
  raridade: string;
  overall: number;
  ATA: number;
  LIF: number;
  POW: number;
  valorMercado: number;
  /** Venda rápida. Vem pronto porque a fatia depende da raridade — quem
   *  consome não tem como derivar do valor de mercado. */
  valorVenda: number;
  /** Carta vinculada: não pode ser vendida, trocada nem transferida. */
  vinculada: boolean;
  /** Não sai em sorteio (carta de evento, ou carta recolhida). */
  foraDeRotacao: boolean;
}

export function paraCartaSimples(carta: Carta): CartaSimples {
  const preco = valoresDaCarta(carta);
  return {
    id: String(carta._id),
    numero: carta.numero ?? null,
    nome: carta.name,
    serie: carta.series,
    imagem: carta.characterImage,
    raridade: String(carta.rarity).toLowerCase(),
    overall: carta.overall ?? 0,
    ATA: carta.ATA ?? 0,
    LIF: carta.LIF ?? 0,
    POW: carta.POW ?? 0,
    valorMercado: preco.marketValue,
    valorVenda: preco.valueToSell,
    // Ausência significa negociável e em rotação: é o caso de todo o
    // acervo anterior às cartas de evento.
    vinculada: carta.comercializavel === false,
    foraDeRotacao: carta.distribuivel === false
  };
}

/** Coleção `users`. Só o que o site precisa ler. */
export interface Jogador {
  _id: ObjectId;
  id: string;
  balance?: number;
  wins?: number;
  losses?: number;
  elo?: number;
  discovered?: { cardId: ObjectId }[];
  inventory?: unknown[];
  conquistas?: { chave: string }[];
  vip?: { tier: string | null; expiresAt: Date | null };
}

/** Números da página inicial. */
export interface EstatisticasSite {
  totalCartas: number;
  totalJogadores: number;
  totalDescobertas: number;
  cartasPorRaridade: Record<string, number>;
  totalSeries: number;
}
