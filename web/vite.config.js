import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: así el sitio funciona en GitHub Pages, que lo publica
  // en https://usuario.github.io/facturacion-prolog-grupo4/
  base: './',
  server: { port: 5173 },
});
