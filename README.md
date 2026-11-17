# iFutebolClube

Site de acompanhamento de torneios de futebol: **www.ifutebolclube.com.br**.

Para cada edição de cada competição o site mostra visão geral, jogos, grupos, seleções, jogadores, eliminatórias e estádios. As edições atuais também têm probabilidades e comparação entre seleções.

## Competições

| Competição | Edições | Observações |
|---|---|---|
| Copa do Mundo | 1930 a 2026 (23) | 1930 a 2022 são históricas e trazem observações por aba sobre o formato de cada época; só 2026 tem estádios, jogadores, probabilidades e comparação |
| Eurocopa | 1960 a 2024 (17) | Só a fase final. A edição "2020" foi disputada em 2021 |
| UEFA Nations League | 2018/19, 2020/21, 2022/23, 2024/25 e 2026/27 | A 2026/27 é atualizada automaticamente pela VM |

Cada edição concluída tem no dashboard o resultado final (campeão, 2º a 4º lugar, artilheiro e gols).

## Como funciona

```
Agentes (C:\AI\Agentes)  →  SQL Server  →  SQLite  →  exportadores (Python)  →  JSON  →  site (React)
```

1. **Agentes** coletam jogos, elencos e estatísticas e gravam no SQL Server (pasta `Agentes`, fora deste repositório).
2. `scripts\sqlserver_para_sqlite.py` copia o banco para `data\sqlite\<Banco>.sqlite`.
3. Os exportadores em `scripts\` leem o banco e geram os JSON em `app\frontend\public\data`.
4. O site (React + Vite + TypeScript) lê esses JSON. Não há servidor de aplicação em produção: o nginx serve arquivos estáticos.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `app/frontend` | Site: React, Vite, TypeScript, Tailwind, zod. Testes E2E com Playwright |
| `scripts` | Exportadores, conversão para SQLite, empacotamento e scripts `.bat` de uso diário |
| `deploy` | Publicação e manutenção da VM do Google (nginx, cron, instalação). Veja `deploy/README.md` |
| `data` | Bancos SQLite locais (não versionados) |
| `posters` | Pôsteres originais das Copas |
| `openspec`, `docs`, `backend` | Especificações, documentação e um esboço de API em .NET (não usado em produção) |

Dados de cada edição: `public/data/editions/<competição>-<ano>.json` (jogos, grupos, seleções), mais a pasta `<competição>-<ano>/` com `teams/`, `matches/`, `player-stats.json` e `summary.json`. O registro das competições e edições fica em `app/frontend/src/data/registry.ts`.

## Rodar localmente

```
cd app\frontend
npm install
npm run dev          # http://localhost:3000
```

Ou use `scripts\iniciar-site.bat`.

## Atualizar dados

Exportar uma competição (usa o SQLite local):

| Script | O que faz |
|---|---|
| `scripts\exportar-eurocopa.bat` | Todas as edições da Eurocopa |
| `scripts\exportar-copas-historicas.bat` | Copas 1930 a 2022 |
| `scripts\exportar-nations-league.bat` | Nations League atual |
| `scripts\coletar-nations-league-historico.bat [anos]` | Coleta e exporta Nations League anteriores (2019, 2021, 2023, 2025) |
| `python scripts\gerar-resumos-edicoes.py` | Gera os `summary.json` (pódio, artilheiro, gols) |

## Testes e pacote de publicação

```
.\rodar-tudo.bat
```

Roda os testes Python e os testes E2E do site, gera os resumos e cria o pacote `release\ifutebolclube-<data>.tar.gz`. Ao final o terminal mostra `PYTHON_EXIT`, `PLAYWRIGHT_EXIT` e `PACOTE_EXIT` (o pacote só é criado se os testes passarem). Detalhes em `logs\rodar-tudo.log`.

## Publicar

1. Envie o pacote de `release\` para a home da VM.
2. Na VM:

```
cd ~ && P=<pacote>.tar.gz && tar -xzf $P deploy historico && sudo bash deploy/publicar_site.sh $P --com-dados
```

`--com-dados` também copia as edições e estatísticas do pacote; os dados da Nations League atual (`nations-league-2027*`) são preservados porque a VM os atualiza sozinha por cron (01:00, 03:30 e 05:30). Mais detalhes, DNS e HTTPS em `deploy/README.md`.

## Fontes de dados

FIFA (Copa do Mundo) e UEFA (Eurocopa e Nations League), coletadas pelos agentes. Não há fotos de jogadores; edições históricas não têm estatísticas individuais além dos gols.
