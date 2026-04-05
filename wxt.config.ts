import { defineConfig } from 'wxt';
import angular from '@analogjs/vite-plugin-angular';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  manifest: {
    name: 'Buff',
    version: '0.1.0',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    resolve: {
      mainFields: ['module'],
    },
    plugins: [
      angular({
        tsconfig: 'tsconfig.app.json',
        transformFilter: (_code: string, id: string) =>
          id.includes('/entrypoints/popup/') ||
          id.includes('/entrypoints/options/'),
      }),
      tailwindcss(),
    ],
  }),
});
