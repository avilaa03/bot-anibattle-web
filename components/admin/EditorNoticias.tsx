'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chamarAdmin } from './api';
import ModalConfirmacao from './ModalConfirmacao';
import { ETIQUETAS, formatarData, type Noticia, type EtiquetaNoticia } from '@/lib/noticias';

/**
 * Editor de notícias da home.
 *
 * Salvar publica na hora: a rota chama `revalidatePath('/')` e derruba o
 * cache da página inicial. Sem isso você salvaria, abriria o site, não
 * veria nada e concluiria que quebrou.
 *
 * Rascunho (`publicada: false`) existe para escrever a notícia da
 * atualização antes de ela sair, sem que o público veja.
 */

const VAZIA = {
  id: '',
  titulo: '',
  resumo: '',
  corpo: '',
  data: new Date().toISOString().slice(0, 10),
  etiqueta: 'novidade' as EtiquetaNoticia,
  destaque: false,
  publicada: true
};

export default function EditorNoticias({ noticias }: { noticias: Noticia[] }) {
  const router = useRouter();

  const [form, setForm] = useState({ ...VAZIA });
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [paraApagar, setParaApagar] = useState<Noticia | null>(null);

  const editando = Boolean(form.id);

  function carregar(n: Noticia) {
    setForm({
      id: n.id, titulo: n.titulo, resumo: n.resumo, corpo: n.corpo,
      data: n.data, etiqueta: n.etiqueta, destaque: n.destaque, publicada: n.publicada
    });
    setAviso(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar() {
    setOcupado(true);
    setAviso(null);
    try {
      const dados = await chamarAdmin('/api/admin/noticias', {
        operacao: 'salvar',
        ...form,
        id: form.id || undefined
      });
      setAviso({ tipo: 'ok', texto: dados.mensagem || 'Salvo.' });
      setForm({ ...VAZIA });
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  async function apagar(confirmacao: string, motivo: string) {
    if (!paraApagar) return;
    setOcupado(true);
    try {
      const dados = await chamarAdmin('/api/admin/noticias', {
        operacao: 'apagar', id: paraApagar.id, confirmacao, motivo
      });
      setAviso({ tipo: 'ok', texto: dados.mensagem || 'Apagada.' });
      setParaApagar(null);
      if (form.id === paraApagar.id) setForm({ ...VAZIA });
      router.refresh();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falhou.' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-6">
      {aviso && (
        <div className={`rounded-lg border p-4 text-sm ${
          aviso.tipo === 'ok'
            ? 'border-green-900/60 bg-green-950/30 text-green-300'
            : 'border-red-900/60 bg-red-950/30 text-red-300'
        }`}>
          {aviso.texto}
        </div>
      )}

      {/* ---------- Formulário ---------- */}
      <section className="cartao p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{editando ? '✏️ Editando notícia' : '📝 Nova notícia'}</h3>
          {editando && (
            <button type="button" onClick={() => setForm({ ...VAZIA })} className="text-xs text-textoFraco hover:text-texto">
              cancelar edição
            </button>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="rotulo">Título</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="campo mt-1" maxLength={140}
              placeholder="Troféus, missões e ranking chegaram"
            />
          </div>

          <div>
            <label className="rotulo">
              Resumo <span className="font-normal">— é o que aparece na home ({form.resumo.length}/800)</span>
            </label>
            <textarea
              value={form.resumo}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
              className="campo mt-1 resize-y" rows={4} maxLength={800}
              placeholder="Dois ou três períodos explicando a novidade para quem ainda não joga."
            />
          </div>

          <div>
            <label className="rotulo">
              Texto completo <span className="font-normal">— opcional, para a página da notícia</span>
            </label>
            <textarea
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
              className="campo mt-1 resize-y font-mono text-xs" rows={8} maxLength={20000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="rotulo">Etiqueta</label>
              <select
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value as EtiquetaNoticia })}
                className="campo mt-1"
              >
                {Object.entries(ETIQUETAS).map(([chave, meta]) => (
                  <option key={chave} value={chave}>{meta.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo">Data</label>
              <input
                type="date" value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="campo mt-1"
              />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={form.destaque}
                  onChange={(e) => setForm({ ...form, destaque: e.target.checked })}
                />
                Destaque na home
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox" checked={form.publicada}
                  onChange={(e) => setForm({ ...form, publicada: e.target.checked })}
                />
                Publicada
              </label>
            </div>
          </div>

          {form.destaque && (
            <p className="text-xs text-amber-400">
              Só uma notícia fica em destaque por vez — salvar esta tira o destaque da atual.
            </p>
          )}

          <button
            type="button" onClick={salvar}
            disabled={ocupado || !form.titulo.trim() || !form.resumo.trim()}
            className="botao-primario disabled:opacity-40"
          >
            {ocupado ? 'Salvando...' : editando ? 'Salvar alterações' : 'Publicar notícia'}
          </button>
        </div>
      </section>

      {/* ---------- Lista ---------- */}
      <section className="cartao overflow-hidden">
        <h3 className="border-b border-borda px-5 py-4 font-semibold">
          Notícias ({noticias.length})
        </h3>

        {noticias.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-textoFraco">
            Nenhuma notícia ainda. Escreva a primeira aí em cima.
          </p>
        ) : (
          <ul className="divide-y divide-borda">
            {noticias.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="etiqueta"
                      style={{ backgroundColor: `${ETIQUETAS[n.etiqueta].cor}22`, color: ETIQUETAS[n.etiqueta].cor }}
                    >
                      {ETIQUETAS[n.etiqueta].label}
                    </span>
                    {n.destaque && (
                      <span className="etiqueta bg-marca/20 text-marca">★ destaque</span>
                    )}
                    {!n.publicada && (
                      <span className="etiqueta bg-superficie2 text-textoFraco">rascunho</span>
                    )}
                  </div>
                  <p className="mt-1.5 font-medium">{n.titulo}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-textoFraco">{n.resumo}</p>
                  <p className="mt-1 text-[11px] text-textoFraco/70">
                    {formatarData(n.data)}
                    {n.autorNome && ` • ${n.autorNome}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs">
                  <button type="button" onClick={() => carregar(n)} className="text-marca hover:underline">
                    editar
                  </button>
                  <button type="button" onClick={() => setParaApagar(n)} className="text-red-400 hover:underline">
                    apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ModalConfirmacao
        aberto={paraApagar !== null}
        titulo="Apagar esta notícia"
        descricao={`"${paraApagar?.titulo ?? ''}" some do site e do painel. O conteúdo fica guardado no log de auditoria.`}
        textoConfirmacao={paraApagar?.titulo ?? ''}
        rotuloConfirmacao="Digite o título da notícia para confirmar"
        exigirMotivo={false}
        ocupado={ocupado}
        onCancelar={() => setParaApagar(null)}
        onConfirmar={({ confirmacao, motivo }) => apagar(confirmacao, motivo)}
      />
    </div>
  );
}
