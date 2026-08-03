import Link from 'next/link';
import { estatisticas } from '@/lib/consultas';
import { getDb } from '@/lib/mongodb';
import { contarBanidos } from '@/lib/admin/jogadores';
import { estadoDoBot } from '@/lib/admin/sistema';
import { listarAuditoria } from '@/lib/admin/auditoria';

export const dynamic = 'force-dynamic';

/**
 * Visão geral do painel.
 *
 * Junta os números do jogo com o estado operacional (bot no ar, contas
 * suspensas) e as últimas ações administrativas. A ideia é que esta seja
 * a primeira tela do dia: se algo está errado, dá para ver aqui sem
 * precisar abrir mais nada.
 */
async function numerosExtras() {
  const db = await getDb();
  const [anuncios, batalhas, vips] = await Promise.all([
    db.collection('markets').countDocuments({ status: 'available' }).catch(() => 0),
    db.collection('battles').countDocuments().catch(() => 0),
    db.collection('users').countDocuments({
      'vip.tier': { $ne: null },
      'vip.expiresAt': { $gt: new Date() }
    }).catch(() => 0)
  ]);
  return { anuncios, batalhas, vips };
}

const ATALHOS = [
  { href: '/admin/jogadores', emoji: '👤', titulo: 'Jogadores', texto: 'Buscar por ID, dar cartas e VIP, banir, resetar.' },
  { href: '/admin/cartas', emoji: '🎴', titulo: 'Cartas', texto: 'Cadastrar carta nova ou corrigir uma existente.' },
  { href: '/admin/noticias', emoji: '📰', titulo: 'Notícias', texto: 'Publicar novidade na página inicial.' },
  { href: '/admin/sistema', emoji: '🩺', titulo: 'Sistema', texto: 'Bot no ar, servidores conectados, saúde do banco.' },
  { href: '/admin/auditoria', emoji: '📋', titulo: 'Auditoria', texto: 'Histórico de tudo que foi feito por aqui.' }
];

export default async function PainelAdmin() {
  const [stats, extras, banidos, bot, auditoria] = await Promise.all([
    estatisticas(),
    numerosExtras(),
    contarBanidos(),
    estadoDoBot(),
    listarAuditoria({ porPagina: 5 })
  ]);

  const cartoes = [
    { rotulo: 'Cartas no catálogo', valor: stats.totalCartas },
    { rotulo: 'Jogadores', valor: stats.totalJogadores },
    { rotulo: 'Séries', valor: stats.totalSeries },
    { rotulo: 'Descobertas totais', valor: stats.totalDescobertas },
    { rotulo: 'Anúncios ativos', valor: extras.anuncios },
    { rotulo: 'Assinantes ativos', valor: extras.vips },
    { rotulo: 'Batalhas em andamento', valor: extras.batalhas },
    { rotulo: 'Contas suspensas', valor: banidos, alerta: banidos > 0 }
  ];

  return (
    <div className="space-y-8">
      {/* ---------- Estado do bot ---------- */}
      <Link
        href="/admin/sistema"
        className={`cartao flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-superficie2 ${
          bot.configurado && !bot.online ? 'border-red-900/60' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={`text-lg ${bot.online ? 'text-green-400' : 'text-red-400'}`}>●</span>
          <div>
            <p className="text-sm font-medium">
              {!bot.configurado
                ? 'O bot ainda não reportou estado'
                : bot.online
                  ? `Bot online em ${bot.totalServidores} servidor(es)`
                  : 'Bot offline'}
            </p>
            <p className="text-xs text-textoFraco">
              {!bot.configurado
                ? 'Reinicie o bot para ele começar a publicar sinal de vida.'
                : bot.online
                  ? `${new Intl.NumberFormat('pt-BR').format(bot.totalMembros)} membros alcançados`
                  : 'Sem sinal de vida há mais de 3 minutos.'}
            </p>
          </div>
        </div>
        <span className="text-xs text-textoFraco">ver detalhes →</span>
      </Link>

      {/* ---------- Números ---------- */}
      <section>
        <h2 className="text-lg font-semibold">Números do jogo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cartoes.map((c) => (
            <div key={c.rotulo} className={`cartao p-5 ${c.alerta ? 'border-red-900/50' : ''}`}>
              <div className={`text-2xl font-bold ${c.alerta ? 'text-red-400' : ''}`}>
                {new Intl.NumberFormat('pt-BR').format(c.valor)}
              </div>
              <div className="mt-1 text-sm text-textoFraco">{c.rotulo}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Atalhos ---------- */}
      <section>
        <h2 className="text-lg font-semibold">O que dá para fazer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ATALHOS.map((a) => (
            <Link key={a.href} href={a.href} className="cartao p-5 transition-colors hover:bg-superficie2">
              <div className="text-2xl">{a.emoji}</div>
              <div className="mt-2 font-medium">{a.titulo}</div>
              <div className="mt-1 text-xs leading-relaxed text-textoFraco">{a.texto}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Cartas por raridade ---------- */}
      <section>
        <h2 className="text-lg font-semibold">Cartas por raridade</h2>
        <div className="cartao mt-4 divide-y divide-borda">
          {Object.entries(stats.cartasPorRaridade).map(([raridade, total]) => (
            <div key={raridade} className="flex items-center justify-between px-5 py-3">
              <span className="capitalize">{raridade}</span>
              <span className="font-bold">{new Intl.NumberFormat('pt-BR').format(total)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Últimas ações ---------- */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimas ações administrativas</h2>
          <Link href="/admin/auditoria" className="text-xs text-marca hover:underline">ver tudo</Link>
        </div>

        {auditoria.registros.length === 0 ? (
          <p className="cartao mt-4 p-5 text-sm text-textoFraco">
            Nada registrado ainda. Toda escrita feita pelo painel aparece aqui, com autor e motivo.
          </p>
        ) : (
          <ul className="cartao mt-4 divide-y divide-borda">
            {auditoria.registros.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm">
                <span>
                  <strong className={r.resultado === 'erro' ? 'text-red-400' : ''}>{r.rotulo}</strong>
                  <span className="text-textoFraco"> — {r.resumo}</span>
                </span>
                <span className="shrink-0 text-xs text-textoFraco">
                  {r.adminNome} • {new Date(r.quando).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
