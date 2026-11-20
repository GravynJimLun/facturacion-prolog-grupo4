// Hook para cargar datos de la API con estado de carga y de error.
//   const { datos, cargando, error, recargar } = useDatos(() => api.productos(), []);
import { useCallback, useEffect, useState } from 'react';

function useDatos(cargar, dependencias) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const [vuelta, setVuelta] = useState(0);

  useEffect(() => {
    let vigente = true; // evita guardar una respuesta vieja si cambian los filtros
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargar()
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch((error) => vigente && setEstado({ datos: null, cargando: false, error }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, vuelta]);

  const recargar = useCallback(() => setVuelta((v) => v + 1), []);
  return { ...estado, recargar };
}

export { useDatos };
