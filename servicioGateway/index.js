import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

// --- DIAGNÓSTICO AL INICIO ---
console.log("--- INICIANDO GATEWAY MAESTRO FINAL ---");
// -----------------------------

// CONFIGURACIÓN DE SEGURIDAD (CORS)
app.use(cors({
  origin: '*', // Permitir todo para depuración final
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// --- SOLUCIÓN PARA EL ERROR OPTIONS/PREFLIGHT ---
app.options('*', cors()); 

// =======================================================================
// 1. RUTAS LOCALES (HEALTH CHECK) - PRIORIDAD MÁXIMA
// =======================================================================
// Movidas al tope para evitar que los proxies las capturen.
app.get('/', (req, res) => {
    res.json({ status: "OK", message: "Gateway Root is Active." });
});

app.get('/api/health', (req, res) => {
    res.json({ status: "OK", server: "Gateway Operational" });
});

// Log de entrada Global (Middleware)
app.use((req, res, next) => {
  console.log(`[GATEWAY GLOBAL] Recibido: ${req.method} ${req.originalUrl}`);
  next();
});


// =======================================================================
// 2. PROXY RULES (RUTEO HACIA MICROSERVICIOS)
// =======================================================================

// --- SERVICIO CUENTAS (COMPLEJO: Mantiene prefijos) ---
// Rutas: /api/auth, /api/socio, /api/user, /api/admin/users/socios
app.use(
  ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
  createProxyMiddleware({
    target: process.env.CUENTAS_URL || 'http://cuentas_container:8082',
    changeOrigin: true,
    // FIX: Reconstruye la ruta completa que Cuentas espera (ej: /api/auth/login)
    pathRewrite: (path, req) => {
      return req.baseUrl + req.url; 
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

// --- SERVICIO GRÁFICOS (TRADUCCIÓN DE RUTA) ---
// Entra: /api/graficos/stats/general -> Sale: /api/charts/stats/general
app.use('/api/graficos', createProxyMiddleware({
  target: process.env.GRAFICOS_URL || 'http://graficos_container:8092',
  changeOrigin: true,
  pathRewrite: { 
    '^/api/graficos': '/api/charts' // TRADUCCIÓN DEL PREFIJO
  }, 
  onError: (err, req, res) => {
     console.error('[ERROR -> GRAFICOS]', err.message);
     res.status(500).json({ error: 'Fallo conexión Gráficos' });
  }
}));


// --- ADMINISTRACIÓN (RECORTE SIMPLE) ---
// Entra: /api/admin/lugares -> Sale: /lugares
app.use('/api/admin', createProxyMiddleware({
  target: process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '' },
  onProxyReq: (proxyReq, req, res) => {
    // Código para reenvío de body de POST/PUT
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// --- CONTENIDO (RECORTE SIMPLE) ---
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL || 'http://contenido_container:8091',
  changeOrigin: true,
  pathRewrite: { '^/api/contenido': '' },
}));

// --- EL RESTO DE SERVICIOS (Todos necesitan recorte simple) ---
app.use('/api/interaccion', createProxyMiddleware({
  target: process.env.INTERACCION_URL || 'http://interaccion_container:8083',
  pathRewrite: { '^/api/interaccion': '' }
}));
app.use('/api/gamificacion', createProxyMiddleware({
  target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084',
  pathRewrite: { '^/api/gamificacion': '' }
}));
app.use('/api/traduccion', createProxyMiddleware({
  target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086',
  pathRewrite: { '^/api/traduccion': '' }
}));
app.use('/api/noticias', createProxyMiddleware({
  target: process.env.NOTICIAS_URL || 'http://noticias_container:8093',
  pathRewrite: { '^/api/noticias': '' } // NOTICIAS TAMBIÉN NECESITA EL RECORTE
}));
app.use('/api/puntos', createProxyMiddleware({
  target: process.env.PUNTOS_URL || 'http://puntos_container:8097',
  pathRewrite: { '^/api/puntos': '' }
}));


// =======================================================================
// MANEJADOR 404 FINAL
// =======================================================================
app.use((req, res) => {
  console.log(`⚠️ [404] Ruta desconocida: ${req.originalUrl}`);
  res.status(404).json({ error: 'Ruta no encontrada en el Gateway', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});