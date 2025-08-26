const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [
    'src/main/main.ts',
    'src/main/preload.ts',
    'src/main/config/manager.ts',
    'src/main/communication/websocket.ts',
    'src/main/download/manager.ts',
    'src/main/ipc/handlers.ts',
    'src/main/utils/environment.ts',
    'src/main/utils/tray.ts'
  ],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outdir: 'dist/main',
  external: ['electron'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@/shared': path.resolve(__dirname, 'src/shared'),
    '@/types': path.resolve(__dirname, 'src/types'),
    '@/utils': path.resolve(__dirname, 'src/utils'),
  },
  sourcemap: true,
  minify: false,
  outbase: 'src/main',
}).catch(() => process.exit(1));
