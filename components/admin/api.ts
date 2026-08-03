'use client';

/**
 * Chamada às rotas administrativas.
 *
 * Sempre POST e sempre mesma origem: o `fetch` do navegador manda o
 * cabeçalho `Origin` automaticamente em requisições não-GET, que é o que
 * o porteiro do servidor confere para barrar CSRF.
 */
export async function chamarAdmin<T = Record<string, unknown>>(
  rota: string,
  corpo: unknown
): Promise<T & { mensagem?: string }> {
  const resposta = await fetch(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo)
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok || dados?.ok !== true) {
    throw new Error(dados?.erro || `A operação falhou (HTTP ${resposta.status}).`);
  }

  return dados as T & { mensagem?: string };
}
