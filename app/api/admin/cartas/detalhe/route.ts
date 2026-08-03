import { rotaAdmin, texto, ErroAdmin } from '@/lib/admin/guarda';
import { buscarCarta } from '@/lib/admin/cartas';

/**
 * Documento completo de uma carta, para preencher o formulário de edição.
 *
 * Existe separado da busca porque o seletor devolve só o resumo (nome,
 * série, raridade). Se o formulário fosse preenchido com esse resumo, as
 * URLs de imagem chegariam vazias — e salvar apagaria as imagens da carta
 * sem ninguém perceber.
 */

export const dynamic = 'force-dynamic';

export const POST = rotaAdmin(async (req) => {
  const corpo = await req.json().catch(() => ({}));
  const id = texto(corpo.id, 'id', { max: 32 });

  const carta = await buscarCarta(id);
  if (!carta) throw new ErroAdmin('Carta não encontrada.', 404);

  return {
    carta: {
      id: String(carta._id),
      numero: carta.numero ?? null,
      name: carta.name,
      series: carta.series,
      characterImage: carta.characterImage ?? '',
      seriesImage: carta.seriesImage ?? '',
      baseImage: carta.baseImage ?? '',
      rarity: String(carta.rarity).toLowerCase(),
      overall: carta.overall ?? 0,
      ATA: carta.ATA ?? 0,
      LIF: carta.LIF ?? 0,
      POW: carta.POW ?? 0
    }
  };
});
