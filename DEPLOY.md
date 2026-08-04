# Deploy automático

Push na `main` → GitHub confere os tipos → se passar, entra na VPS por SSH, traz o código novo e reconstrói o contêiner. Se o site não responder em 120 segundos, volta sozinho para a versão anterior.

Push na `develop` só roda a verificação. Produção não é tocada.

O passo a passo de configuração é o **mesmo do bot** — veja o `DEPLOY.md` do repositório `bot_animefight`. Aqui ficam só as diferenças.

## O que muda em relação ao bot

| | Bot | Site |
|---|---|---|
| Verificação no GitHub | `npm test` (10 arquivos) | `tsc --noEmit` |
| Como sabe que subiu | log com "O bot está pronto" | `curl` na porta 3000 |
| Espera antes de reverter | 90s | 120s |
| Serviço no compose | `bot` | `web` |

**Por que o CI não roda `npm run build`.** O build de produção do Next executa os Server Components para gerar as páginas, e isso exige uma `MONGODB_URI` válida — que não vai (nem deve) existir num runner do GitHub. O build de verdade acontece na VPS, onde o `.env` está.

O typecheck sozinho já pega o que mais quebra aqui: campo do banco digitado errado, prop faltando, e import de módulo de servidor dentro de componente com `'use client'` — que foi exatamente o erro `Can't resolve 'net'` que já apareceu uma vez.

**Por que o script exporta o `.env` antes de subir.** O `MONGODB_URI` é passado como `ARG` no build, porque o Next precisa dele para gerar as páginas. O Docker Compose lê `args` do ambiente do shell, não do `env_file` — sem o `source .env`, o build sairia com a variável vazia e as páginas viriam em branco.

## Secrets

Os mesmos nomes do bot, mas **cadastrados neste repositório** (secrets não são compartilhados entre repos):

`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `DEPLOY_DIR` — e o `DEPLOY_DIR` aponta para a pasta do **site** na VPS, não a do bot.

Dá para reaproveitar a mesma chave SSH nos dois repositórios.

## Quando der errado

```bash
cd /caminho/do/anibattle-site
docker compose logs --tail 100 web
curl -I http://127.0.0.1:3000/
docker compose up -d --build
```

O erro mais comum aqui é o build ficar sem memória: o Next compilando numa VPS pequena chega a passar de 1 GB. Se acontecer, `free -h` mostra, e a saída é criar swap ou passar a construir a imagem no GitHub (GHCR) em vez de na VPS.
