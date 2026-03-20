import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Load Firebase config from JSON if it exists (for local dev/AI Studio)
    let firebaseConfig: any = {};
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configJson = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        firebaseConfig = {
          VITE_FIREBASE_API_KEY: configJson.apiKey,
          VITE_FIREBASE_AUTH_DOMAIN: configJson.authDomain,
          VITE_FIREBASE_PROJECT_ID: configJson.projectId,
          VITE_FIREBASE_APP_ID: configJson.appId,
          VITE_FIREBASE_DATABASE_ID: configJson.firestoreDatabaseId
        };
      } catch (e) {
        console.error('Error loading firebase-applet-config.json:', e);
      }
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || null),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || null),
        // Inject Firebase config
        'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || firebaseConfig.VITE_FIREBASE_API_KEY || null),
        'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.VITE_FIREBASE_AUTH_DOMAIN || null),
        'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.VITE_FIREBASE_PROJECT_ID || null),
        'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || firebaseConfig.VITE_FIREBASE_APP_ID || null),
        'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.VITE_FIREBASE_DATABASE_ID || null)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
