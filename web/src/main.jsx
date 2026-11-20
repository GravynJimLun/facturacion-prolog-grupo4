import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './estilos.css';

// HashRouter (direcciones con #/) porque GitHub Pages solo sirve archivos
// estáticos: con rutas normales, recargar /historial daría 404.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
