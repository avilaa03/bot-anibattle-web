import { NextResponse } from 'next/server';
import { gerarState } from '@/lib/auth';
import { urlAutorizacao } from '@/lib/discord';

export const dynamic = 'force-dynamic';

/** Inicia o login: gera o state anti-CSRF e manda para o Discord. */
export async function GET() {
  try {
    const state = await gerarState();
    return NextResponse.redirect(urlAutorizacao(state));
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'erro desconhecido';
    console.error('[auth/login]', mensagem);
    return NextResponse.redirect(
      new URL(`/entrar?erro=configuracao`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    );
  }
}
