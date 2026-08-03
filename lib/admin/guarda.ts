import { NextResponse, type NextRequest } from 'next/server';
import { getSessao, ehAdmin, type Sessao } from '@/lib/auth';

/**
 * Porteiro das rotas de escrita do painel.
 *
 * ATENÇÃO AO MOTIVO DESTE ARQUIVO EXISTIR: a proteção que está em
 * `app/admin/layout.tsx` só vale para as PÁGINAS de /admin. Rotas em
 * `app/api/**` não passam por aquele layout — se uma rota de escrita
 * confiasse nele, qualquer pessoa na internet poderia dar VIP a si mesma
 * com um `curl`. Toda rota administrativa precisa chamar `rotaAdmin`.
 *
 * Camadas aplicadas, em ordem:
 *
 * 1. Método POST. Nunca GET: navegador dispara GET sozinho (imagem,
 *    prefetch, link em Discord), e uma ação destrutiva não pode acontecer
 *    porque alguém colou uma URL num chat.
 * 2. Origem confere com o host. É a defesa contra CSRF: mesmo que o
 *    `sameSite: lax` do cookie falhe em algum navegador antigo, um site
 *    hostil não consegue forjar o cabeçalho `Origin`.
 * 3. Sessão válida e assinada, e o id está em ADMIN_DISCORD_IDS. A lista
 *    é lida do ambiente a cada requisição, então tirar alguém de lá
 *    derruba o acesso na hora, sem esperar a sessão expirar.
 * 4. Limite de requisições por administrador.
 */

export class ErroAdmin extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

// ---------- Limite de requisições ----------

const JANELA_MS = 60_000;
const MAXIMO_POR_JANELA = 40;
const historico = new Map<string, number[]>();

function conferirLimite(chave: string): void {
  const agora = Date.now();
  const recentes = (historico.get(chave) || []).filter((t) => agora - t < JANELA_MS);

  if (recentes.length >= MAXIMO_POR_JANELA) {
    throw new ErroAdmin(
      `Muitas operações seguidas (limite de ${MAXIMO_POR_JANELA} por minuto). Espere um pouco.`,
      429
    );
  }

  recentes.push(agora);
  historico.set(chave, recentes);

  // Faxina preguiçosa: evita o mapa crescer para sempre num processo longo.
  if (historico.size > 500) {
    for (const [k, v] of historico) {
      if (v.every((t) => agora - t >= JANELA_MS)) historico.delete(k);
    }
  }
}

// ---------- Verificações ----------

function conferirOrigem(req: NextRequest): void {
  const origem = req.headers.get('origin');
  const host = req.headers.get('host');

  if (!origem) {
    throw new ErroAdmin('Requisição sem cabeçalho Origin foi recusada.', 403);
  }

  let hostDaOrigem: string;
  try {
    hostDaOrigem = new URL(origem).host;
  } catch {
    throw new ErroAdmin('Cabeçalho Origin malformado.', 403);
  }

  if (!host || hostDaOrigem !== host) {
    throw new ErroAdmin('Origem da requisição não confere com o site.', 403);
  }
}

export async function exigirAdminApi(req: NextRequest): Promise<Sessao> {
  if (req.method !== 'POST') {
    throw new ErroAdmin('Operações administrativas só por POST.', 405);
  }

  conferirOrigem(req);

  let sessao: Sessao | null;
  try {
    sessao = await getSessao();
  } catch {
    // getSessao lança se SESSION_SECRET não estiver configurado.
    throw new ErroAdmin('Login não está configurado no servidor.', 500);
  }

  if (!sessao) throw new ErroAdmin('Você não está autenticado.', 401);
  if (!ehAdmin(sessao)) throw new ErroAdmin('Sua conta não tem acesso ao painel.', 403);

  conferirLimite(sessao.id);
  return sessao;
}

/** IP de quem chamou, para o log de auditoria. */
export function ipDaRequisicao(req: NextRequest): string | null {
  const encaminhado = req.headers.get('x-forwarded-for');
  if (encaminhado) return encaminhado.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

// ---------- Envelope das rotas ----------

/**
 * Envolve o handler de uma rota administrativa.
 *
 * O handler só roda depois de todas as verificações passarem, e recebe a
 * sessão já validada. O que ele devolver vira o corpo JSON da resposta.
 */
export function rotaAdmin(
  handler: (req: NextRequest, sessao: Sessao) => Promise<Record<string, unknown>>
) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    try {
      const sessao = await exigirAdminApi(req);
      const dados = await handler(req, sessao);
      return NextResponse.json({ ok: true, ...dados });
    } catch (err) {
      const status = err instanceof ErroAdmin ? err.status : 500;
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado.';

      // Erro inesperado (bug, banco fora) não deve vazar detalhe interno
      // para o navegador; o console do servidor recebe o rastro completo.
      if (status === 500) console.error('[admin] falha na rota:', err);

      return NextResponse.json(
        { ok: false, erro: status === 500 ? 'Erro interno. Veja o console do servidor.' : mensagem },
        { status }
      );
    }
  };
}

// ---------- Validação de entrada ----------

export function texto(valor: unknown, campo: string, { obrigatorio = true, max = 500 } = {}): string {
  const s = typeof valor === 'string' ? valor.trim() : '';
  if (!s) {
    if (obrigatorio) throw new ErroAdmin(`Campo "${campo}" é obrigatório.`);
    return '';
  }
  if (s.length > max) throw new ErroAdmin(`Campo "${campo}" passa de ${max} caracteres.`);
  return s;
}

export function inteiro(valor: unknown, campo: string, { min = 0, max = 1_000_000, padrao = 0 } = {}): number {
  if (valor === undefined || valor === null || valor === '') return padrao;
  const n = Number(valor);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ErroAdmin(`Campo "${campo}" precisa ser um número inteiro.`);
  }
  if (n < min || n > max) throw new ErroAdmin(`Campo "${campo}" precisa ficar entre ${min} e ${max}.`);
  return n;
}

/** IDs do Discord são snowflakes: 17 a 20 dígitos. */
export function idDiscord(valor: unknown, campo = 'id'): string {
  const s = texto(valor, campo, { max: 32 });
  if (!/^\d{17,20}$/.test(s)) {
    throw new ErroAdmin(`"${s}" não parece um ID do Discord (esperado 17 a 20 dígitos).`);
  }
  return s;
}
