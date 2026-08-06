'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chamarAdmin } from './api';
import SeletorCarta, { type CartaEscolhida } from './SeletorCarta';
import DetalheEvento from './DetalheEvento';
import { TIPOS, CORES_STATUS, nomeDoTipo, type ItemCatalogo } from './eventosComuns';
import type { Evento, TipoEvento } from '@/lib/admin/eventos';

/**
 * Painel de eventos.
 *
 * ## O fluxo é sempre o mesmo, de propósito
 *
 * Criar → montar a lista de participantes → conferir → distribuir.
 *
 * O que muda entre os três tipos é só o passo do meio. Fazer três telas
 * diferentes seria mais bonito e três vezes mais fácil de errar.
 *
 * ## Por que "buscar" e "adicionar" são dois botões
 *
 * Buscar por critério ("todos do nível 10+") pode devolver quatro mil
 * pessoas. Se buscar já adicionasse, um clique errado viraria uma
 * premiação de quatro mil pessoas — e premiação não tem desfazer.
 *
 * Então busca mostra a contagem, e adicionar é um segundo clique, com o
 * número na frente dos olhos.
 */

interface Props {
  eventosIniciais: Evento[];
  itens: ItemCatalogo[];
}

export default function PainelEventos({ eventosIniciais, itens }: Props) {
  const router = useRouter();
  const [eventos, setEventos] = useState(eventosIniciais);
  const [selecionado, setSelecionado] = useState<Evento | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function recarregar(idFoco?: string) {
    router.refresh();
    if (idFoco) {
      try {
        const d = await chamarAdmin<{ evento: Evento }>('/api/admin/eventos', {
          acao: 'detalhe',
          eventoId: idFoco
        });
        setSelecionado(d.evento);
        setEventos((atual) => atual.map((e) => (e.id === idFoco ? d.evento : e)));
      } catch {
        // Se o detalhe falhar, o refresh acima ainda traz a lista nova.
      }
    }
  }

  return (
    <div className="space-y-8">
      {erro && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {aviso}
        </div>
      )}

      {!criando && (
        <button type="button" className="botao-primario" onClick={() => setCriando(true)}>
          + Novo evento
        </button>
      )}

      {criando && (
        <FormularioNovoEvento
          itens={itens}
          onCancelar={() => setCriando(false)}
          onCriado={(evento) => {
            setEventos((atual) => [evento, ...atual]);
            setSelecionado(evento);
            setCriando(false);
            setAviso(`Evento "${evento.nome}" criado. Agora monte a lista de participantes.`);
          }}
          onErro={setErro}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ListaEventos
          eventos={eventos}
          selecionadoId={selecionado?.id ?? null}
          onSelecionar={async (e) => {
            setErro('');
            setAviso('');
            setSelecionado(e);
            await recarregar(e.id);
          }}
        />

        {selecionado ? (
          <DetalheEvento
            evento={selecionado}
            itens={itens}
            onErro={setErro}
            onAviso={setAviso}
            onMudou={() => recarregar(selecionado.id)}
            onApagado={() => {
              setEventos((atual) => atual.filter((e) => e.id !== selecionado.id));
              setSelecionado(null);
              router.refresh();
            }}
          />
        ) : (
          <div className="rounded-xl border border-borda bg-superficie p-8 text-center text-sm text-textoFraco">
            Escolha um evento à esquerda para ver participantes e distribuir os prêmios.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------

function ListaEventos({
  eventos,
  selecionadoId,
  onSelecionar
}: {
  eventos: Evento[];
  selecionadoId: string | null;
  onSelecionar: (e: Evento) => void;
}) {
  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border border-borda bg-superficie p-6 text-sm text-textoFraco">
        Nenhum evento ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {eventos.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onSelecionar(e)}
          className={`w-full rounded-xl border p-4 text-left transition-colors ${
            e.id === selecionadoId
              ? 'border-primaria bg-superficie2'
              : 'border-borda bg-superficie hover:bg-superficie2'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold">{e.nome}</span>
            <span className={`shrink-0 rounded px-2 py-0.5 text-[11px] uppercase ${CORES_STATUS[e.status]}`}>
              {e.status}
            </span>
          </div>
          <div className="mt-1 text-xs text-textoFraco">{nomeDoTipo(e.tipo)}</div>
          <div className="mt-2 text-xs text-textoFraco">
            {e.totalPremiados} de {e.totalParticipantes} premiado(s)
          </div>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------

function EditorPremios({
  moedas,
  setMoedas,
  cartas,
  setCartas,
  quantidades,
  setQuantidades,
  itensEscolhidos,
  setItensEscolhidos,
  itens
}: {
  moedas: number;
  setMoedas: (n: number) => void;
  cartas: CartaEscolhida[];
  setCartas: (c: CartaEscolhida[]) => void;
  quantidades: Record<string, number>;
  setQuantidades: (q: Record<string, number>) => void;
  itensEscolhidos: Record<string, number>;
  setItensEscolhidos: (i: Record<string, number>) => void;
  itens: ItemCatalogo[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Moedas por jogador</label>
        <input
          type="number"
          min={0}
          value={moedas}
          onChange={(e) => setMoedas(Math.max(0, Number(e.target.value) || 0))}
          className="w-40 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Cartas</label>
        <p className="mb-2 text-xs text-textoFraco">
          Cada participante recebe uma cópia própria. Cartas de evento marcadas como não
          negociáveis chegam já vinculadas.
        </p>
        <SeletorCarta
          valor={null}
          rotulo="Adicionar carta ao prêmio"
          onEscolher={(c) => {
            if (!c || cartas.some((x) => x.id === c.id)) return;
            setCartas([...cartas, c]);
            setQuantidades({ ...quantidades, [c.id]: 1 });
          }}
        />

        {cartas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {cartas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
              >
                <span>
                  <strong>{c.nome}</strong>
                  <span className="ml-2 text-xs text-textoFraco">
                    {c.serie} · {c.raridade} · OVR {c.overall}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantidades[c.id] ?? 1}
                    onChange={(e) =>
                      setQuantidades({
                        ...quantidades,
                        [c.id]: Math.max(1, Math.min(100, Number(e.target.value) || 1))
                      })
                    }
                    className="w-16 rounded border border-borda bg-superficie px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:underline"
                    onClick={() => setCartas(cartas.filter((x) => x.id !== c.id))}
                  >
                    remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Itens</label>
        <div className="flex flex-wrap gap-3">
          {itens.map((i) => (
            <label key={i.chave} className="flex items-center gap-2 text-sm">
              <span>{i.emoji} {i.nome}</span>
              <input
                type="number"
                min={0}
                value={itensEscolhidos[i.chave] ?? 0}
                onChange={(e) =>
                  setItensEscolhidos({
                    ...itensEscolhidos,
                    [i.chave]: Math.max(0, Number(e.target.value) || 0)
                  })
                }
                className="w-16 rounded border border-borda bg-fundo px-2 py-1 text-sm"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------

function FormularioNovoEvento({
  itens,
  onCancelar,
  onCriado,
  onErro
}: {
  itens: ItemCatalogo[];
  onCancelar: () => void;
  onCriado: (e: Evento) => void;
  onErro: (m: string) => void;
}) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoEvento>('direto');
  const [moedas, setMoedas] = useState(0);
  const [cartas, setCartas] = useState<CartaEscolhida[]>([]);
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [itensEscolhidos, setItensEscolhidos] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    onErro('');
    try {
      const d = await chamarAdmin<{ evento: Evento }>('/api/admin/eventos', {
        acao: 'criar',
        nome,
        descricao,
        tipo,
        premios: {
          moedas,
          cartas: cartas.map((c) => ({ cartaId: c.id, quantidade: quantidades[c.id] ?? 1 })),
          itens: itensEscolhidos
        }
      });
      onCriado(d.evento);
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não deu para criar o evento.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-xl border border-borda bg-superficie p-6">
      <h3 className="mb-5 text-lg font-bold">Novo evento</h3>

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Torneio de aniversário"
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Aparece para o jogador no /evento"
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Como as pessoas entram</label>
          <div className="grid gap-3 sm:grid-cols-3">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => setTipo(t.valor)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  tipo === t.valor
                    ? 'border-primaria bg-superficie2'
                    : 'border-borda bg-fundo hover:bg-superficie2'
                }`}
              >
                <div className="font-semibold">{t.nome}</div>
                <div className="mt-1 text-xs text-textoFraco">{t.descricao}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-borda pt-5">
          <h4 className="mb-3 font-semibold">Prêmio de cada participante</h4>
          <EditorPremios
            moedas={moedas}
            setMoedas={setMoedas}
            cartas={cartas}
            setCartas={setCartas}
            quantidades={quantidades}
            setQuantidades={setQuantidades}
            itensEscolhidos={itensEscolhidos}
            setItensEscolhidos={setItensEscolhidos}
            itens={itens}
          />
        </div>

        <div className="flex gap-3 border-t border-borda pt-5">
          <button type="button" className="botao-primario" disabled={salvando} onClick={salvar}>
            {salvando ? 'Criando…' : 'Criar evento'}
          </button>
          <button type="button" className="botao-secundario" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
