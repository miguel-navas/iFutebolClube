# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.ts` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/main.tsx` - Project entry point
- `src/App.tsx` - Router component (imports pages and sets up routes)
- `src/pages/Index.tsx` - Main page entry point (modify this file to build your UI)
- `src/index.css` - Existing CSS configuration

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

## Note

The `@/` path alias points to the `src/` directory

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Start Preview**

```shell
pnpm run dev
```

**To build**

```shell
pnpm run build
```


---

## iFutebolClube: endereços e publicação na VM do Google

### Endereços do site

| Endereço | Conteúdo |
| --- | --- |
| `/` | Início: cartões das competições (Copa do Mundo, Eurocopa, UEFA Nations League) |
| `/:competicao` | Edições disponíveis da competição (ex.: `/copa`) |
| `/:competicao/:ano` | Visão geral da edição (ex.: `/copa/2026`) |
| `/:competicao/:ano/jogos`, `grupos`, `selecoes`, `selecoes/:codigo`, `eliminatorias`, `estadios` | Seções da edição |

Endereços antigos (`/matches`, `/groups`, `/teams`, `/teams/:code`, `/bracket`, `/stadiums`) redirecionam para a Copa do Mundo 2026.
Novas competições e edições entram em `src/data/registry.ts`; só aparecem no site as edições registradas com dados.

### Publicar (build estático)

```bash
npm ci
npm run build        # gera dist/
```

Copie o conteúdo de `dist/` para a pasta servida pela VM.

O site é uma aplicação de página única. O servidor **precisa devolver `index.html` para qualquer caminho que não seja um arquivo**; sem isso, atualizar a página em `/copa/2026/jogos` resulta em 404.

nginx:

```nginx
server {
    root /var/www/ifutebolclube;   # pasta com o conteúdo de dist/
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Apache (`.htaccess` ou bloco do site, com `mod_rewrite` não necessário):

```apache
FallbackResource /index.html
```

Depois de publicar, abra `/copa/2026/jogos` direto no navegador e atualize a página: ela deve carregar normalmente.

### Mapa da Copa (histórico de sedes)

A página `/copa` mostra um mapa-múndi (Leaflet, sem tiles de serviços externos) com um marcador por sede e edição.
O desenho dos países vem de `public/data/countries-50m.geojson` (Natural Earth 50m, domínio público), carregado só nessa página.
As sedes ficam em `src/data/worldCupHosts.ts`; os marcadores só abrem edições registradas em `src/data/registry.ts`.

Para regenerar o arquivo de países (`world-atlas` e `topojson-client` só são usados por este script, não entram no `package.json`):

```bash
cd app/frontend
npm install --no-save world-atlas@2.0.2 topojson-client@3.1.0
node scripts/build-world-geojson.mjs
```

### Testes

```bash
npm run test:e2e      # testes de navegador contra o servidor de desenvolvimento
npm run test:preview  # compila e testa o site como será publicado
```

Se o Chromium do Playwright não estiver instalado, rode `npx playwright install chromium` ou aponte `E2E_CHROMIUM` para um Chrome/Chromium existente.

## Estatísticas da Copa (painel da tela inicial)

O painel lê `public/data/stats/copa.json`, gerado a partir do banco `CopaDoMundo` (só edições concluídas).
Na máquina que tem o SQL Server, na raiz do projeto:

```
scripts\exportar-estatisticas.bat
```

O `.bat` usa o Python e o `.env` do agente (`C:\AI\Agentes\uefa-nations-league`). Sem esse ambiente, rode
`pip install pyodbc` e `python scripts/export-stats.py`; o script lê `scripts/.env` ou o `.env` do agente, com
`SQL_SERVER`, `SQL_USER`, `SQL_PASSWORD` e, se quiser, `SQL_DRIVER` e `SQL_DATABASE_COPA` (padrão `CopaDoMundo`).
Sem `SQL_USER`, usa a autenticação do Windows. Depois de gerar, `npm run build` e
publique `dist/`; para atualizar os números basta repetir o script.

**Próxima Copa:** copie `scripts/next-edition.example.json` para `scripts/next-edition.json`, preencha
sede, datas, seleções e estádios e rode o script de novo. O bloco da próxima Copa só aparece no site se esse
arquivo existir e o ano for maior que o da última edição exportada. Sem o arquivo, o bloco não aparece.

## Dados da edição (grupos, classificação e jogos)

As páginas da edição (grupos, jogos, seleções, jogo) leem `public/data/editions/copa-<ano>.json`, gerado do banco
`CopaDoMundo`. Para atualizar a Copa 2026:

```
scripts\exportar-edicao.bat
```

(`scripts\exportar-edicao.bat 2022` exporta outra edição.) Os horários saem em horário de Brasília. Se o arquivo não
existir ou estiver inválido, o site usa os dados de exemplo embutidos, sem mostrar erro. Chaveamento, estádios,
elencos e jogadores ainda usam os dados embutidos.

### Lances e escalações de cada jogo

A página do jogo mostra gols, cartões e substituições com o minuto, as escalações e uma legenda de ícones.
Esses dados vêm de um arquivo por jogo, `public/data/editions/copa-<ano>/matches/<número do jogo>.json`,
que o site só baixa quando a página daquele jogo é aberta. Sem o arquivo, a página mostra um aviso e o resto continua igual.

O `scripts\exportar-edicao.bat` grava esses arquivos junto com o da edição (use `--sem-detalhes` para pular):

```
scripts\exportar-edicao.bat            (edição 2026)
scripts\exportar-edicao.bat 2022       (outra edição)
```

Gol contra é detectado quando o jogador pertence ao outro time; gol de pênalti, quando existe um lance de pênalti
do mesmo jogador no mesmo minuto na tabela `Eventos` (sem esse lance, aparece como gol normal).
Os pênaltis da disputa aparecem numa seção própria, só com os convertidos.

### Elenco e técnico de cada seleção

A página da seleção mostra o elenco completo e o técnico, e a janela de cada jogador (aberta também pela página do jogo)
mostra idade, foto e os números da Copa (jogos, titular, gols, assistências, cartões).
Os dados vêm de `public/data/editions/copa-<ano>/teams/<CÓDIGO>.json`, gravado pelo mesmo `scripts\exportar-edicao.bat`.
Sem o arquivo, a página mostra o elenco embutido de exemplo. O técnico é o nome que mais aparece nos jogos da seleção.
Clubes e jogos pela seleção não existem no banco, por isso não aparecem. Se a foto não carregar, aparecem as iniciais.

A janela do jogador também mostra o total de jogos e de gols em todas as Copas que estão no banco (não inclui jogos fora de Copas).
Os clubes não existem no banco: para mostrá-los, crie `scripts\clubes.json` com `{"<JogadorId>": ["Clube A", "Clube B"]}` (do mais antigo ao atual) e rode o export de novo.

Clubes, jogos e gols **pela seleção** vêm do agente `C:\AI\Agentes\copa-jogadores` (Wikipédia, tabela `PerfilJogadores`).
Rode o agente e depois `scripts\exportar-edicao.bat`; jogadores sem perfil mostram os totais em Copas. A janela mostra a fonte quando usa esses dados.


## Ranking da FIFA (masculino)

A página inicial mostra o ranking mundial masculino da FIFA a partir de `public/data/stats/fifa-ranking.json`
(`updatedAt`, `source`, `teams[{rank, code, name, confederation, points}]`). O arquivo é um retrato da página
<https://inside.fifa.com/pt/fifa-rankings/world-ranking/men> (a tabela é montada por JavaScript, por isso não há
exportador automático). A confederação vem de uma tabela fixa por código FIFA. Para atualizar, gere um novo arquivo
no mesmo formato e troque `updatedAt`. Se o arquivo não existir ou for inválido, a seção mostra só o ranking em Copas.

## Chave das eliminatórias

A aba Eliminatórias monta a árvore pelo vencedor de cada jogo (`src/components/bracket/layout.ts`). Fases sem jogo no
arquivo da edição aparecem como vagas vazias. A chave ocupa toda a largura e rola na horizontal só em telas estreitas.
