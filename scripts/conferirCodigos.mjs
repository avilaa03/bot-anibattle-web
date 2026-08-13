/**
 * Confere se `lib/codigos.ts` ainda bate com o `redeem.js` e o
 * `rewards.js` do bot.
 *
 * ## Por que este script existe
 *
 * O site GERA os códigos e o bot os CONSOME. Se os dois discordarem, o
 * erro não aparece em lugar nenhum até um cliente pagante tentar
 * resgatar:
 *
 * | Divergência | O que o cliente vê |
 * |---|---|
 * | Alfabeto ou formato | "Esse código não parece certo" |
 * | Tipo de recompensa a mais no site | o resgate falha no meio |
 * | Chave de item/caixa que só existe num lado | idem |
 * | Teto diferente | o painel aceita e o bot recusa |
 *
 * Em todos os casos o dinheiro já entrou. Por isso a conferência é de
 * strings e listas, não de "parece igual".
 *
 * Rode antes de mexer em qualquer um dos dois:
 *   npm run codigos:conferir
 *
 * O caminho do bot pode ser passado por variável de ambiente:
 *   CAMINHO_BOT=../bot_anibattle npm run codigos:conferir
 */

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const CAMINHO_BOT = process.env.CAMINHO_BOT || '../bot_anibattle';
const utils = path.resolve(CAMINHO_BOT, 'Commands/utils');

if (!existsSync(path.join(utils, 'redeem.js'))) {
    console.log(`\n⚠️  Não achei o bot em "${CAMINHO_BOT}".`);
    console.log('   Os repositórios são separados, então esta conferência é opcional.');
    console.log('   Para rodar: CAMINHO_BOT=/caminho/do/bot_anibattle npm run codigos:conferir\n');
    process.exit(0);
}

const redeemDoBot = require(path.join(utils, 'redeem.js'));
const rewardsDoBot = require(path.join(utils, 'rewards.js'));
const itensDoBot = require(path.join(utils, 'items.js'));
const caixasDoBot = require(path.join(utils, 'boxes.js'));

const site = readFileSync(new URL('../lib/codigos.ts', import.meta.url), 'utf8');
const siteItens = readFileSync(new URL('../lib/itens.ts', import.meta.url), 'utf8');
const siteCaixas = readFileSync(new URL('../lib/caixas.ts', import.meta.url), 'utf8');

let divergencias = 0;
const conferir = (nome, doBot, doSite) => {
    const igual = String(doBot) === String(doSite);
    if (!igual) divergencias++;
    console.log(`  ${igual ? 'OK     ' : 'DIVERGE'} ${nome.padEnd(26)} bot=${doBot}`);
    if (!igual) console.log(`  ${''.padEnd(34)} site=${doSite}`);
};

console.log('\nConferindo lib/codigos.ts contra o bot:\n');

// ---- Formato do código ----

const alfabetoDoSite = (site.match(/ALFABETO = '([^']+)'/) || [])[1];
conferir('alfabeto', redeemDoBot.ALFABETO, alfabetoDoSite);

const prefixoDoSite = (site.match(/PREFIXO = '([^']+)'/) || [])[1];
conferir('prefixo', redeemDoBot.PREFIXO, prefixoDoSite);

/**
 * A prova que vale mais que comparar constantes.
 *
 * Um código gerado pelo BOT tem que passar no formato do SITE. Se o
 * tamanho do grupo ou o número de grupos divergir — coisas que as duas
 * constantes acima não cobrem — é aqui que aparece.
 *
 * O `.ts` do site não é importável por Node puro, então o regex é
 * remontado a partir do que foi lido do arquivo. É menos elegante que
 * importar, e testa exatamente a mesma coisa.
 */
const geradoPeloBot = redeemDoBot.gerarCodigo();
const gruposDoSite = Number((site.match(/GRUPOS = (\d+)/) || [])[1]);
const tamanhoDoSite = Number((site.match(/TAMANHO_GRUPO = (\d+)/) || [])[1]);
const regexDoSite = new RegExp(
    `^${prefixoDoSite}(-[${alfabetoDoSite}]{${tamanhoDoSite}}){${gruposDoSite}}$`
);

const aceito = regexDoSite.test(geradoPeloBot);
if (!aceito) divergencias++;
console.log(`  ${aceito ? 'OK     ' : 'DIVERGE'} ${'código do bot no site'.padEnd(26)} ${geradoPeloBot}`);

// ---- Tipos de recompensa ----

const tiposDoBot = Object.keys(rewardsDoBot.TIPOS).sort();
const tiposDoSite = ((site.match(/TIPOS: TipoRecompensa\[\] = \[([^\]]+)\]/) || [])[1] || '')
    .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort();

conferir('tipos de recompensa', tiposDoBot.join(','), tiposDoSite.join(','));

// ---- Tetos ----

for (const chave of Object.keys(rewardsDoBot.MAXIMO)) {
    const doSite = (site.match(new RegExp(`${chave}: ([\\d_]+)`)) || [])[1];
    conferir(`teto de ${chave}`, rewardsDoBot.MAXIMO[chave], Number(String(doSite).replace(/_/g, '')));
}

// ---- Catálogos que viram chave no banco ----
//
// Item e caixa entram na bolsa como CAMINHO DE CAMPO no Mongo. Uma chave
// que só existe de um lado gera código vendido que falha no resgate.

const itensBot = Object.keys(itensDoBot.ITENS).sort();
const itensSite = [...siteItens.matchAll(/^\s{2}(\w+): \{/gm)].map((m) => m[1]).sort();
conferir('chaves de item', itensBot.join(','), itensSite.join(','));

const caixasBot = Object.keys(caixasDoBot.CAIXAS).sort();
const caixasSite = [...siteCaixas.matchAll(/^\s{2}(\w+): \{ chave:/gm)].map((m) => m[1]).sort();
conferir('chaves de caixa', caixasBot.join(','), caixasSite.join(','));

const prefixoCaixaSite = (siteCaixas.match(/PREFIXO_BOLSA = '([^']+)'/) || [])[1];
conferir('prefixo de caixa na bolsa', caixasDoBot.PREFIXO_BOLSA, prefixoCaixaSite);

// ---- A promessa que sustenta o desenho ----
//
// Nenhum tipo de recompensa pode entregar vantagem de combate. É a mesma
// regra do VIP, e agora ela vale para algo comprado com dinheiro real.

console.log('');
const PROIBIDOS = ['ATA', 'LIF', 'POW', 'overall', 'rarity', 'raridade', 'dano', 'critico'];
const suspeitos = Object.keys(rewardsDoBot.TIPOS).filter((t) =>
    PROIBIDOS.some((p) => t.toLowerCase().includes(p.toLowerCase()))
);

if (suspeitos.length > 0) {
    console.log(`  DIVERGE  tipo de recompensa com cara de combate: ${suspeitos.join(', ')}`);
    divergencias++;
} else {
    console.log('  OK      nenhum tipo de recompensa mexe em atributo de carta');
}

console.log(divergencias === 0
    ? '\n✓ O site gera códigos que o bot entende.\n'
    : `\n⚠️  ${divergencias} divergência(s). Um código gerado agora pode falhar no resgate.\n`);

process.exit(divergencias ? 1 : 0);
