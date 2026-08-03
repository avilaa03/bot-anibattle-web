import { NextResponse } from 'next/server';
import { encerrarSessao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Logout via POST, não GET.
 *
 * Se fosse GET, bastaria alguém colocar <img src="/api/auth/logout"> num
 * fórum para deslogar quem visitasse a página.
 */
export async function POST() {
  await encerrarSessao();
  return NextResponse.redirect(new URL('/', SITE), { status: 303 });
}
