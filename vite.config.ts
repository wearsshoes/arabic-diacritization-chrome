import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, defineManifest } from '@crxjs/vite-plugin';

// Define the manifest dynamically
const manifest = defineManifest({
  manifest_version: 3,
  name: "Easy Peasy Arabizi",
  version: "0.4.1",
  description: "Allows users to add pronunciation diacritics (taškīl) to Arabic text or convert Arabic text to Arabizi.",
  permissions: [
    "activeTab",
    "tabs",
    "contextMenus",
    "storage",
    "scripting",
    "commands",
    "debugger"
  ],
  background: {
    service_worker: "src/background/background-entry.ts"
  },
  options_ui: {
    page: "src/options/optionsPage.html",
    open_in_tab: true
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content.tsx"]
    }
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  },
  action: {
    default_popup: "src/popup/extensionPopup.html",
    default_title: "Easy Peasy Arabizi"
  },
  commands: {
    "toggle-widget": {
      suggested_key: {
        default: "Ctrl+Shift+U",
        mac: "Command+Shift+U"
      },
      description: "Toggle the widget."
    }
  },
  host_permissions: [
    "<all_urls>"
  ]
});

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  server: {
    hmr: {
      port: 24601,
    },
    watch: {
      usePolling: true,
    },
  },
  build: {
    sourcemap: true, // Ensure source maps are generated
    outDir: 'dist',
  },
});
