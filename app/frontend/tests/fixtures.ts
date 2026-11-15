import { test as base, expect } from '@playwright/test';

/**
 * `page` com os arquivos de edição (`data/editions/*.json`) respondendo 404 por padrão, para os testes
 * usarem sempre os dados embutidos, mesmo quando existe um arquivo real exportado.
 * Um teste que quer o arquivo cria a própria rota depois, que tem prioridade.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/data/editions/**', (route) =>
      route.fulfill({ status: 404, body: 'not found' }),
    );
    await page.route('**/data/stats/fifa-ranking.json', (route) =>
      route.fulfill({ status: 404, body: 'not found' }),
    );
    await use(page);
  },
});

export { expect };
