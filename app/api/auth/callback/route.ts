import { NextRequest, NextResponse } from 'next/server';
import { validarState, salvarSessao } from '@/lib/auth';
import { trocarCodePorToken, buscarUsuario, revogarToken } from '@/lib/discord';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function voltarComErro(motivo: string) {
  return NextResponse.redirect(new URL(`/entrar?erro=${motivo}`, SITE));
}

/**
 * Callback do Discord.
 *
 * Ordem importa: validamos o `state` ANTES de trocar o código. Se
 * trocássemos primeiro, um pedido forjado já teria consumido o código.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // O usuário pode ter clicado em "cancelar" na tela do Discord.
  if (params.get('error')) return voltarComErro('cancelado');

  const code = params.get('code');
  const state = params.get('state');

  if (!code) return voltarComErro('sem_codigo');
  if (!(await validarState(state))) return voltarComErro('state_invalido');

  try {
    const token = await trocarCodePorToken(code);
    const usuario = await buscarUsuario(token);

    // Não precisamos mais do token: a sessão daqui em diante é nossa.
    await revogarToken(token);

    await salvarSessao({
      id: usuario.id,
      nome: usuario.global_name || usuario.username,
      avatar: usuario.avatar
    });

    return NextResponse.redirect(new URL('/', SITE));
  } catch (erro) {
    console.error('[auth/callback]', erro instanceof Error ? erro.message : erro);
    return voltarComErro('falha');
  }
}
