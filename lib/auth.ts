import crypto from 'crypto';
import { cookies } from 'next/headers';

/**
 * Sessão do site.
 *
 * A sessão é um cookie assinado com HMAC-SHA256 — o mesmo princípio de um
 * JWT, mas sem dependência externa. O conteúdo é legível (não é segredo:
 * são só id, nome e avatar públicos do Discord), mas NÃO é falsificável
 * sem a chave: qualquer alteração no payload invalida a assinatura.
 *
 * Cuidados que valem explicar:
 * - `httpOnly` impede JavaScript da página de ler o cookie (XSS não rouba sessão)
 * - `sameSite: lax` bloqueia o cookie em requisição de outro site (CSRF)
 * - `secure` em produção obriga HTTPS
 * - a comparação da assinatura é em tempo constante, para não vazar a
 *   chave por diferença de tempo de resposta
 */

const NOME_COOKIE = 'anibattle_sessao';
const NOME_COOKIE_STATE = 'anibattle_oauth_state';
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface Sessao {
  id: string;
  nome: string;
  avatar: string | null;
  expiraEm: number;
}

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres). '
      + 'Gere um com: openssl rand -hex 32'
    );
  }
  return s;
}

function assinar(dados: string): string {
  return crypto.createHmac('sha256', segredo()).update(dados).digest('base64url');
}

/** Comparação em tempo constante — evita descobrir a chave por timing. */
function assinaturaConfere(recebida: string, esperada: string): boolean {
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function criarToken(sessao: Sessao): string {
  const payload = Buffer.from(JSON.stringify(sessao)).toString('base64url');
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string | undefined): Sessao | null {
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length !== 2) return null;

  const [payload, assinatura] = partes;
  if (!assinaturaConfere(assinatura, assinar(payload))) return null;

  try {
    const sessao = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Sessao;
    if (!sessao?.id || typeof sessao.expiraEm !== 'number') return null;
    if (Date.now() > sessao.expiraEm) return null;  // expirada
    return sessao;
  } catch {
    return null;
  }
}

/** Sessão do visitante atual, ou null. */
export async function getSessao(): Promise<Sessao | null> {
  const store = await cookies();
  return lerToken(store.get(NOME_COOKIE)?.value);
}

export async function salvarSessao(dados: Omit<Sessao, 'expiraEm'>): Promise<void> {
  const sessao: Sessao = { ...dados, expiraEm: Date.now() + DURACAO_MS };
  const store = await cookies();

  store.set(NOME_COOKIE, criarToken(sessao), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_MS / 1000
  });
}

export async function encerrarSessao(): Promise<void> {
  const store = await cookies();
  store.delete(NOME_COOKIE);
}

// ---------- CSRF do fluxo OAuth ----------

/**
 * O `state` protege contra CSRF no OAuth: geramos um valor aleatório,
 * guardamos num cookie e mandamos junto na URL do Discord. No callback,
 * os dois têm que bater — senão alguém poderia induzir você a completar
 * um login que não foi você quem começou.
 */
export async function gerarState(): Promise<string> {
  const state = crypto.randomBytes(24).toString('base64url');
  const store = await cookies();

  store.set(NOME_COOKIE_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600  // 10 minutos: tempo de sobra para logar, curto para atacar
  });

  return state;
}

export async function validarState(recebido: string | null): Promise<boolean> {
  if (!recebido) return false;

  const store = await cookies();
  const guardado = store.get(NOME_COOKIE_STATE)?.value;
  store.delete(NOME_COOKIE_STATE);  // uso único

  if (!guardado) return false;
  return assinaturaConfere(recebido, guardado);
}

// ---------- Permissão de administrador ----------

/** IDs do Discord com acesso ao painel. Vazio = ninguém entra. */
export function idsAdmin(): string[] {
  return (process.env.ADMIN_DISCORD_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ehAdmin(sessao: Sessao | null): boolean {
  if (!sessao) return false;
  const permitidos = idsAdmin();
  // Lista vazia bloqueia todo mundo, de propósito: uma variável de
  // ambiente esquecida não pode virar painel aberto.
  if (permitidos.length === 0) return false;
  return permitidos.includes(sessao.id);
}

/** Para usar no topo de página/rota do admin. Lança se não tiver acesso. */
export async function exigirAdmin(): Promise<Sessao> {
  const sessao = await getSessao();
  if (!ehAdmin(sessao)) {
    throw new Error('SEM_PERMISSAO');
  }
  return sessao as Sessao;
}

export function urlAvatar(id: string, avatar: string | null): string {
  if (!avatar) {
    // Avatar padrão do Discord, calculado pelo id.
    const indice = (BigInt(id) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${indice}.png`;
  }
  const ext = avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
}

export const COOKIE_SESSAO = NOME_COOKIE;
