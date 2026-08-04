/**
 * Confere se `lib/vip.ts` ainda bate com o `vip.js` do bot.
 *
 * A página /vip é uma página de vendas: ela promete cooldown menor, daily
 * maior e um número de molduras. Se alguém ajustar um plano no bot e
 * esquecer do site, o site passa a mentir para quem está pagando — e
 * ninguém percebe, porque nada quebra.
 *
 * Rode antes de mexer em preço ou vantagem:
 *   npm run vip:conferir
 *
 * O caminho do bot pode ser passado por variável de ambiente:
 *   CAMINHO_BOT=../bot_animefight npm run vip:conferir
 */

import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const CAMINHO_BOT = process.env.CAMINHO_BOT || '../bot_animefight';
const utils = path.resolve(CAMINHO_BOT, 'Commands/utils');

if (!existsSync(path.join(utils, 'vip.js'))) {
    console.log(`\n⚠️  Não achei o bot em "${CAMINHO_BOT}".`);
    console.log('   Os repositórios são separados, então esta conferência é opcional.');
    console.log('   Para rodar: CAMINHO_BOT=/caminho/do/bot_animefight npm run vip:conferir\n');
    process.exit(0);
}

const { TIERS: DO_BOT } = require(path.join(utils, 'vip.js'));

// A wishlist guarda os limites por plano fora do vip.js.
const wishlist = readFileSync(path.join(utils, 'wishlist.js'), 'utf8');
const limitesDesejo = JSON.parse(
    wishlist.match(/LIMITE_VIP = (\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":')
);
const desejosGratis = Number(wishlist.match(/LIMITE_BASE = (\d+)/)[1]);

const site = readFileSync(new URL('../lib/vip.ts', import.meta.url), 'utf8');

let divergencias = 0;
const conferir = (nome, doBot, doSite) => {
    // Compara como número: "0.90" e 0.9 são o mesmo valor, e reprovar por
    // formatação só geraria ruído.
    const igual = Number(doBot) === Number(doSite);
    if (!igual) divergencias++;
    console.log(`  ${igual ? 'OK     ' : 'DIVERGE'} ${nome.padEnd(22)} bot=${doBot}  site=${doSite}`);
};

console.log('\nConferindo lib/vip.ts contra o bot:\n');

for (const [chave, tier] of Object.entries(DO_BOT)) {
    const bloco = site.split(`${chave}: {`)[1]?.split('},')[0];
    if (!bloco) {
        console.log(`  FALTA   plano "${chave}" não existe em lib/vip.ts`);
        divergencias++;
        continue;
    }

    const campo = (nome) => (bloco.match(new RegExp(`${nome}: ([\\d.]+)`)) || [])[1];
    const molduras = (bloco.match(/molduras: \[([^\]]*)\]/) || ['', ''])[1]
        .split(',').filter((s) => s.trim()).length;

    conferir(`${chave}.preço`, tier.precoBRL, campo('precoBRL'));
    conferir(`${chave}.cooldown`, tier.rollCooldownMultiplier, campo('rollCooldownMultiplier'));
    conferir(`${chave}.daily`, tier.dailyMultiplier, campo('dailyMultiplier'));
    conferir(`${chave}.molduras`, tier.molduras.length, molduras);
    conferir(`${chave}.desejos`, limitesDesejo[chave], campo('limiteDesejos'));
}

conferir('desejos (grátis)', desejosGratis, (site.match(/LIMITE_DESEJOS_GRATIS = (\d+)/) || [])[1]);

// A promessa central da página: nenhum plano toca em combate.
const CAMPOS_DE_COMBATE = ['ATA', 'LIF', 'POW', 'overall', 'raridade', 'rarity', 'dano', 'damage'];
const comCombate = Object.entries(DO_BOT).filter(([, t]) =>
    Object.keys(t).some((k) => CAMPOS_DE_COMBATE.includes(k))
);

console.log('');
if (comCombate.length > 0) {
    console.log(`  DIVERGE  planos com campo de combate: ${comCombate.map(([k]) => k).join(', ')}`);
    console.log('           A página /vip promete que isso nunca acontece.');
    divergencias++;
} else {
    console.log('  OK      nenhum plano expõe campo de combate');
}

console.log(divergencias === 0
    ? '\n✓ A página de VIP está dizendo a verdade.\n'
    : `\n⚠️  ${divergencias} divergência(s). A página /vip está prometendo algo diferente do que o bot entrega.\n`);

process.exit(divergencias ? 1 : 0);
