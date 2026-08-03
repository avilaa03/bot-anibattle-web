import { rotaAdmin, texto } from '@/lib/admin/guarda';
import { procurarCartas } from '@/lib/admin/jogadores';

/**
 * Busca de cartas para os formulários do painel.
 *
 * É POST mesmo sendo leitura, porque `rotaAdmin` só aceita POST — e essa
 * regra vale a pena manter uniforme: uma exceção "só para leitura" é
 * exatamente o tipo de brecha que alguém aproveita depois, quando a rota
 * ganhar um parâmetro a mais sem ninguém reparar.
 */

export const dynamic = 'force-dynamic';

export const POST = rotaAdmin(async (req) => {
  const corpo = await req.json().catch(() => ({}));
  const termo = texto(corpo.termo, 'termo', { obrigatorio: false, max: 120 });
  const cartas = await procurarCartas(termo, 25);
  return { cartas };
});
