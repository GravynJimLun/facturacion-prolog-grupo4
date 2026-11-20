// Configuración del backend. Todo sale de variables de entorno (archivo
// .env en la raíz del repositorio, que NUNCA se sube a GitHub).

function leerConfig(env = process.env) {
  const config = {
    databaseUrl: env.DATABASE_URL,
    puerto: Number(env.PORT) || 3000,
    // Se permiten varios orígenes separados por coma, por ejemplo:
    // CORS_ORIGIN=http://localhost:5173,https://usuario.github.io
    origenesCors: (env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    motor: env.MOTOR === 'real' ? 'real' : 'falso',
  };

  if (!config.databaseUrl) {
    throw new Error(
      'Falta DATABASE_URL. Copie .env.example como .env (en la raíz del repositorio) ' +
        'y ponga ahí la cadena de conexión de Neon.',
    );
  }
  return config;
}

export { leerConfig };
