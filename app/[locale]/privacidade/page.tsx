import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AvisoSoPortugues from '@/components/AvisoSoPortugues';
import { traduzir } from '@/lib/i18n';
import { ehIdioma, IDIOMA_PADRAO, type Idioma } from '@/lib/i18n/config';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = traduzir(ehIdioma(locale) ? locale : IDIOMA_PADRAO);
  return {
    title: t('legal.privacidade_titulo'),
    description: t('legal.privacidade_descricao'),
    robots: { index: true, follow: false }
  };
}

/**
 * O texto completo vive em `bot_animefight/PRIVACIDADE.md`.
 *
 * Enquanto o site não lê esse arquivo automaticamente, mantenha os dois
 * em sincronia ao mudar qualquer coisa — documento legal desatualizado é
 * pior que documento nenhum.
 *
 * O corpo fica em português nos três idiomas — veja o porquê em
 * `components/AvisoSoPortugues.tsx`.
 */
export default async function PaginaPrivacidade({ params }: Props) {
  const { locale } = await params;
  if (!ehIdioma(locale)) notFound();
  const idioma = locale as Idioma;

  return (
    <div className="container-site max-w-3xl py-16">
      <AvisoSoPortugues idioma={idioma} />

      <h1 className="mt-8 text-3xl font-bold" lang={IDIOMA_PADRAO}>Política de Privacidade</h1>
      <p className="mt-2 text-sm text-textoFraco" lang={IDIOMA_PADRAO}>
        Última atualização: 2 de agosto de 2026
      </p>

      <div className="mt-10 space-y-8 leading-relaxed text-textoFraco" lang={IDIOMA_PADRAO}>
        <section>
          <h2 className="text-xl font-semibold text-texto">Que dados coletamos</h2>
          <p className="mt-3">
            Coletamos apenas o necessário para o jogo funcionar.{' '}
            <strong className="text-texto">
              Não lemos nem armazenamos o conteúdo das suas mensagens
            </strong>{' '}
            — o bot funciona exclusivamente por comandos de barra e botões, e não usa
            a permissão de leitura de mensagens do Discord.
          </p>
          <ul className="mt-4 list-inside list-disc space-y-1.5">
            <li>Seu ID de usuário do Discord (apenas o número)</li>
            <li>Cartas do inventário e da Pokédex</li>
            <li>Saldo de moedas virtuais e histórico de batalhas</li>
            <li>Anúncios criados no mercado e cosméticos equipados</li>
          </ul>
          <p className="mt-4">
            Não armazenamos nome de usuário, e-mail, avatar ou qualquer dado pessoal
            além do ID do Discord.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Pagamentos</h2>
          <p className="mt-3">
            <strong className="text-texto">
              Não temos acesso aos dados do seu cartão, chave PIX ou conta bancária.
            </strong>{' '}
            O pagamento acontece inteiramente no ambiente do provedor, e recebemos de
            volta apenas a confirmação de que foi aprovado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Seus direitos (LGPD)</h2>
          <p className="mt-3">
            Você pode a qualquer momento saber quais dados temos, corrigi-los,
            excluí-los ou receber uma cópia. Escreva para o e-mail de contato ou abra
            um chamado no servidor de suporte — respondemos em até 15 dias.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Itens virtuais</h2>
          <p className="mt-3">
            Moedas, cartas e cosméticos não têm valor monetário real, não são
            conversíveis em dinheiro e não podem ser resgatados fora do bot.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-texto">Direitos autorais</h2>
          <p className="mt-3">
            O AniBattle é um projeto de fã, sem vínculo, patrocínio ou aprovação dos
            detentores dos direitos das obras retratadas. Se você detém direitos sobre
            algum conteúdo e deseja sua remoção, entre em contato — atendemos.
          </p>
        </section>
      </div>
    </div>
  );
}
