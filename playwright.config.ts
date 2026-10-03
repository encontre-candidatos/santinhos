import { defineConfig, devices } from '@playwright/test';

// Porta própria (não a 4173 padrão do vite preview): com reuseExistingServer, um preview de
// outro projeto na 4173 seria reaproveitado em silêncio e os testes rodariam contra ele.
const porta = Number(process.env.PORTA_E2E ?? 4183);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Local (Windows): com o padrão (metade dos núcleos) vários Chromium em paralelo carregando as
  // 48 fotos e o pré-cache do SW travavam o page.goto até o tempo limite. Dois dá conta.
  workers: process.env.CI ? undefined : 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${porta}`,
    // 'retain-on-failure' grava trace de todo teste; com as 48 fotos o fechamento do contexto
    // estourava o tempo. Só na repetição (CI).
    trace: 'on-first-retry'
  },
  webServer: {
    // base vazio nos testes; o build publicado é refeito com BASE_PATH no workflow
    command: `npm run build && npm run preview -- --port ${porta} --strictPort`,
    port: porta,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000, // o build (base + fotos + SW) leva ~70 s; folga para máquina lenta
    env: { BASE_PATH: '' }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] } }
  ]
});
