import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Regras de uso do AniBattle.',
  robots: { index: true, follow: false }
};

/**
 * O texto completo vive em `bot_animefight/TERMOS.md`.
 * Mantenha os dois em sincronia.
 */
export default function PaginaTermos() {
  return (
    <div className="container-site max-w-3xl py-16">
      <h1 className="text-3xl font-bold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-textoFraco">Última atualização: 2 de agosto de 2026</p>

      <div className="mt-10 space-y-8 leading-relaxed text-textoFraco">
        <section>
          <h2 className="text-xl font-semibold text-texto">Quem pode usar</h2>
          <p className="mt-3">
            Você precisa ter a idade mínima exigida pelo Discord no seu país (13 anos
            no mínimo) e cumprir os Termos de Serviço do Discord. Menores de 18 anos só
            podem contratar assinatura com autorização de um responsável.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Itens virtuais</h2>
          <p className="mt-3">
            Moedas, cartas e cosméticos são licenças de uso dentro do jogo, não
            propriedade sua.{' '}
            <strong className="text-texto">Não têm valor monetário real</strong> e não
            podem ser trocados por dinheiro. É proibido comprar, vender ou trocar
            itens, contas ou moedas por dinheiro real fora do bot.
          </p>
          <p className="mt-3">
            Valores, raridades e regras de balanceamento podem ser ajustados a qualquer
            momento — jogos com economia precisam de ajuste.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Apostas em batalhas</h2>
          <p className="mt-3">
            O comando de batalha permite apostar <strong className="text-texto">moedas do jogo</strong>,
            que não têm valor real e não podem ser compradas com dinheiro. É um mecanismo
            de jogo, não é aposta com dinheiro real e não constitui jogo de azar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Assinaturas</h2>
          <p className="mt-3">
            Os planos dão vantagens de <strong className="text-texto">aparência</strong> e{' '}
            <strong className="text-texto">conveniência</strong>.{' '}
            <strong className="text-texto">Nenhum plano dá vantagem de combate</strong> —
            atributos das cartas, chance de raridade e resultado de batalhas são idênticos
            para assinantes e não assinantes.
          </p>
          <p className="mt-3">
            Conforme o artigo 49 do Código de Defesa do Consumidor, você pode desistir em
            até 7 dias da contratação e receber o valor de volta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Conduta</h2>
          <p className="mt-3">É proibido:</p>
          <ul className="mt-3 list-inside list-disc space-y-1.5">
            <li>Usar programas ou automações para jogar por você</li>
            <li>Explorar falhas do bot em vez de reportá-las</li>
            <li>Criar contas alternativas para farmar moedas</li>
            <li>Comprar, vender ou trocar contas e itens por dinheiro real</li>
          </ul>
          <p className="mt-3">
            Encontrou um bug que dá vantagem? Reporte no servidor de suporte. Reportar é
            bem-visto; explorar dá punição.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Direitos autorais</h2>
          <p className="mt-3">
            Projeto de fã, sem vínculo com os detentores dos direitos das obras
            retratadas. O valor cobrado nas assinaturas refere-se exclusivamente a
            recursos e serviços do bot, não à venda de personagens ou de qualquer
            conteúdo protegido.
          </p>
        </section>
      </div>
    </div>
  );
}
