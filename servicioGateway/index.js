import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

// --- DIAGNÓSTICO AL INICIO ---
console.log("--- INICIANDO GATEWAY MAESTRO ---");
// -----------------------------

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// --- SOLUCIÓN PARA EL ERROR OPTIONS/PREFLIGHT ---
app.options('*', cors()); // <--- AÑADE ESTA LÍNEA

// Log de entrada Global
app.use((req, res, next) => {
  console.log(`[GATEWAY GLOBAL] Recibido: ${req.method} ${req.originalUrl}`);
  next();
});

// =======================================================================
// 1. SERVICIO CUENTAS (Complejo - Mantiene prefijos)
// =======================================================================
const TARGET_CUENTAS = 'http://cuentas_container:8082';

app.use(
  ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
  createProxyMiddleware({
    target: process.env.CUENTAS_URL || 'http://cuentas_container:8082',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Si el path es /socios/stats, req.baseUrl es /api/admin/socios.
      return req.baseUrl + path;
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🚀 [PROXY -> CUENTAS] Enviando: ${req.baseUrl}${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('[ERROR -> CUENTAS]', err.message);
      res.status(500).json({ error: 'Fallo conexión Cuentas' });
    }
  })
);

// =======================================================================
// 2. SERVICIOS QUE NECESITAN "RECORTAR" LA URL (pathRewrite)
// =======================================================================


// --- ADMINISTRACIÓN (LUGARES, REWARDS) ---
// Entra: /api/admin/lugares -> Sale: /lugares
// OJO: Esta ruta debe ir DESPUÉS de /api/admin/users (Cuentas) para no chocar
app.use('/api/admin', createProxyMiddleware({
  target: process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '' },
  onProxyReq: (proxyReq, req, res) => {
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
    console.log(`🚀 [PROXY -> ADMIN] Enviando: ${req.url}`);
  }
}));

// --- CONTENIDO ---
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL || 'http://contenido_container:8091',
  changeOrigin: true,
  pathRewrite: { '^/api/contenido': '' },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🚀 [PROXY -> CONTENIDO] Enviando: ${req.url}`);
  }
}));

// --- INTERACCIÓN ---
app.use('/api/interaccion', createProxyMiddleware({
  target: process.env.INTERACCION_URL || 'http://interaccion_container:8083',
  changeOrigin: true,
  pathRewrite: { '^/api/interaccion': '' }
}));

// --- GAMIFICACIÓN (RECOMPENSAS) ---
app.use('/api/gamificacion', createProxyMiddleware({
  target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084',
  changeOrigin: true,
  pathRewrite: { '^/api/gamificacion': '' }
}));

// --- TRADUCCIÓN ---
app.use('/api/traduccion', createProxyMiddleware({
  target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086',
  changeOrigin: true,
  pathRewrite: { '^/api/traduccion': '' }
}));

// --- NOTICIAS (Ahora pasa la ruta completa) ---
app.use('/api/noticias', createProxyMiddleware({
  target: process.env.NOTICIAS_URL || 'http://noticias_container:8093',
  changeOrigin: true,
  // ¡QUITAMOS EL PATH REWRITE! Esto envía /api/noticias/locales tal cual.
  // pathRewrite: { '^/api/noticias': '' } <-- ESTA LÍNEA DEBE DESAPARECER O ESTAR COMENTADA
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🚀 [PROXY -> NOTICIAS] Enviando: ${req.url} (RUTA COMPLETA)`);
  },
  onError: (err, req, res) => {
    console.error('[ERROR -> NOTICIAS]', err.message);
    res.status(500).json({ error: 'Fallo conexión Noticias' });
  }
}));

// --- PUNTOS ---
app.use('/api/puntos', createProxyMiddleware({
  target: process.env.PUNTOS_URL || 'http://puntos_container:8097',
  changeOrigin: true,
  pathRewrite: { '^/api/puntos': '' }
}));

// =======================================================================
// SERVICIO GRÁFICOS (DASHBOARD) - TRADUCCIÓN DE RUTA
// =======================================================================
app.use('/api/graficos', createProxyMiddleware({
  target: process.env.GRAFICOS_URL || 'http://graficos_container:8092',
  changeOrigin: true,

  // CORRECCIÓN MAESTRA:
  // Como Express ya quitó '/api/graficos', la ruta que llega aquí es solo '/stats/...'
  // Le decimos: "Al inicio (^/), ponle '/api/charts/'"
  pathRewrite: {
    '^/': '/api/charts/'
  },

  onProxyReq: (proxyReq, req, res) => {
    // Nota: req.url aquí ya tiene el rewrite aplicado internamente por el proxy antes de enviarse
    console.log(`🚀 [PROXY -> GRAFICOS] Enviando: ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[ERROR -> GRAFICOS]', err.message);
    res.status(500).json({ error: 'Fallo conexión Gráficos' });
  }
}));


// =======================================================================
// MANEJADOR FINAL
// =======================================================================

app.get('/api', (req, res) => {
  res.json({ status: 'OK', message: 'API Gateway Full Activo 🚀' });
});

// Manejador 404
app.use((req, res) => {
  console.log(`⚠️ [404] Ruta desconocida: ${req.originalUrl}`);
  res.status(404).json({ error: 'Ruta no encontrada en el Gateway', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});