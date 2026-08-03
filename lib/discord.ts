/**
 * Comunicação com a API do Discord no fluxo OAuth2.
 *
 * Escopo pedido: apenas `identify` — id, nome de usuário e avatar.
 * Não pedimos e-mail nem lista de servidores porque não precisamos, e
 * pedir permissão a mais só afasta o usuário na tela de autorização.
 */

const API = 'https://discord.com/api/v10';

export interface UsuarioDiscord {
  id: string;
  username: string;
  global_name?: string | null;
  avatar: string | null;
}

function config() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();

  // Barra no final vira barra dupla no redirect e o Discord recusa com
  // "invalid OAuth2 redirect_uri" — erro chato de achar. Removemos aqui.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    .trim()
    .replace(/\/+$/, '');

  if (!clientId || !clientSecret) {
    throw new Error(
      'DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET são obrigatórios. '
      + 'Pegue no Discord Developer Portal > sua aplicação > OAuth2.'
    );
  }

  return { clientId, clientSecret, redirectUri: `${siteUrl}/api/auth/callback` };
}

/** O redirect_uri exato que precisa estar cadastrado no portal. */
export function redirectUriEsperado(): string {
  try {
    return config().redirectUri;
  } catch {
    const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      .trim().replace(/\/+$/, '');
    return `${base}/api/auth/callback`;
  }
}

/** URL para onde mandamos o usuário autorizar. */
export function urlAutorizacao(state: string): string {
  const { clientId, redirectUri } = config();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state
  });

  // Log de diagnóstico: quando o Discord recusa o redirect, este é o
  // dado que resolve o problema em segundos em vez de meia hora.
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[oauth] client_id=${clientId}\n`
      + `[oauth] redirect_uri=${redirectUri}\n`
      + '[oauth] Este redirect_uri precisa estar cadastrado EM ESTA aplicação '
      + '(Developer Portal > OAuth2 > Redirects), com o mesmo client_id acima.'
    );
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Troca o `code` do callback por um token de acesso. */
export async function trocarCodePorToken(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = config();

  const resposta = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }),
    cache: 'no-store'
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => '');
    throw new Error(`Discord recusou a troca do código (${resposta.status}): ${detalhe.slice(0, 200)}`);
  }

  const dados = await resposta.json();
  if (!dados.access_token) throw new Error('Resposta do Discord sem access_token.');
  return dados.access_token as string;
}

/** Busca os dados do usuário autenticado. */
export async function buscarUsuario(accessToken: string): Promise<UsuarioDiscord> {
  const resposta = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });

  if (!resposta.ok) {
    throw new Error(`Não foi possível ler o perfil no Discord (${resposta.status}).`);
  }

  return resposta.json() as Promise<UsuarioDiscord>;
}

/**
 * Revoga o token depois de usá-lo.
 *
 * Só precisamos do token uma vez, para descobrir quem é o usuário — daí
 * em diante a sessão é nossa. Manter um token vivo que não vamos usar é
 * superfície de ataque de graça.
 */
export async function revogarToken(accessToken: string): Promise<void> {
  try {
    const { clientId, clientSecret } = config();
    await fetch(`${API}/oauth2/token/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: accessToken,
        token_type_hint: 'access_token'
      })
    });
  } catch {
    // Falhar aqui não impede o login; o token expira sozinho.
  }
}
