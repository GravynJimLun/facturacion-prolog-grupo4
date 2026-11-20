// Estructura general: encabezado con navegación y las rutas de cada pantalla.
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { USAR_DATOS_DE_PRUEBA } from './api.js';
import Catalogo from './paginas/Catalogo.jsx';
import NuevaFactura from './paginas/NuevaFactura.jsx';
import Historial from './paginas/Historial.jsx';
import Emitir from './paginas/Emitir.jsx';
import Detalle from './paginas/Detalle.jsx';
import Reportes from './paginas/Reportes.jsx';

const ENLACES = [
  { a: '/catalogo', texto: 'Catálogo' },
  { a: '/nueva', texto: 'Nueva factura' },
  { a: '/historial', texto: 'Historial' },
  { a: '/reportes', texto: 'Reportes' },
];

export default function App() {
  return (
    <>
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="encabezado">
        <div className="contenedor encabezado-interno">
          <p className="marca">Facturación · Grupo 4</p>
          <nav aria-label="Principal">
            <ul className="menu">
              {ENLACES.map(({ a, texto }) => (
                <li key={a}>
                  <NavLink to={a}>{texto}</NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {USAR_DATOS_DE_PRUEBA && (
        <p className="aviso-prueba" role="note">
          Modo de prueba: los datos son de ejemplo y no se guarda nada.
        </p>
      )}

      <main id="contenido" className="contenedor">
        <Routes>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/nueva" element={<NuevaFactura />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/facturas/:id" element={<Detalle />} />
          <Route path="/facturas/:id/emitir" element={<Emitir />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="*" element={<p>Esta página no existe.</p>} />
        </Routes>
      </main>
    </>
  );
}
