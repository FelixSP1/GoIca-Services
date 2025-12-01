import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

app.use(cors({ origin: '*' }));

// Log Global
app.use((req, res, next) => {
  console.log(`[GATEWAY GLOBAL] Recibido: ${req.method} ${req.originalUrl}`);
  next();
});

// --- DIAGNÓSTICO AL INICIO ---
console.log("--- INICIANDO GATEWAY ---");
console.log("CUENTAS_URL detectada:", process.env.CUENTAS_URL || "¡VACÍA/UNDEFINED! ⚠️");
console.log("CONTENIDO_URL detectada:", process.env.CONTENIDO_URL || "¡VACÍA/UNDEFINED! ⚠️");
// -----------------------------

// =======================================================================
// CONFIGURACIÓN MAESTRA DE CUENTAS (Simplificada)
// =======================================================================
// 1. Definimos el destino FIJO (Hardcodeado) para descartar errores de variables
const TARGET_CUENTAS = 'http://cuentas_container:8082';

console.log("--> Configurando Rutas de Cuentas hacia:", TARGET_CUENTAS);

// 2. Middleware de depuración específico para rutas de Cuentas
app.use('/api/auth', (req, res, next) => {
  console.log("✅ [DEBUG] Express detectó una petición para /api/auth. Iniciando Proxy...");
  next(); 
});

// 3. El Proxy Real
app.use(
  ['/api/auth', '/api/socio', '/api/user', '/api/admin'], 
  createProxyMiddleware({
    target: TARGET_CUENTAS,
    changeOrigin: true,
    // onProxyReq es el momento justo antes de enviar la petición
    onProxyReq: (proxyReq, req, res) => {
       console.log(`🚀 [PROXY SALIENTE] Enviando a Cuentas: ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
       console.error('wq [PROXY ERROR]', err);
       res.status(500).json({ error: 'Fallo al conectar con el microservicio', msg: err.message });
    }
  })
);

// =======================================================================
// CONFIGURACIÓN DE CONTENIDO (Ya funcionaba, la dejamos igual pero limpia)
// =======================================================================
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL || 'http://contenido_container:8091',
  changeOrigin: true,
  pathRewrite: { '^/api/contenido': '' },
  onProxyReq: (proxyReq, req, res) => {
     console.log(`🚀 [PROXY SALIENTE] Enviando a Contenido: ${req.url}`);
  }
}));

// --- Interacción ---
app.use('/api/interaccion', createProxyMiddleware({
  target: process.env.INTERACCION_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/interaccion': '' } // Asumiendo que Interacción también monta en raíz
}));

// --- Gamificación ---
app.use('/api/gamificacion', createProxyMiddleware({
  target: process.env.GAMIFICACION_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/gamificacion': '' }
}));

// --- Traducción ---
app.use('/api/traduccion', createProxyMiddleware({
  target: process.env.TRADUCCION_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/traduccion': '' }
}));


// =======================================================================
// GRUPO 3: CASOS ESPECIALES (Admin general, Gráficos, Noticias)
// =======================================================================

// --- Administración (General) ---
// Si tu servicio de administración espera recibir /api/admin... no pongas rewrite.
// Si espera recibir /... pon rewrite. (Asumiré rewrite para ser consistente con microservicios)
app.use('/api/admin', createProxyMiddleware({
  target: process.env.ADMINISTRACION_URL,
  changeOrigin: true,
  // pathRewrite: { '^/api/admin': '' }, // <--- DESCOMENTA ESTO SI FALLA ADMIN
  onProxyReq: (proxyReq, req, res) => {
    // Fix para que el body (JSON) pase correctamente en peticiones POST/PUT
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
}));

// --- Gráficos ---
// Conservo tu lógica original de agregar /api/charts
app.use('/api/graficos', createProxyMiddleware({
  target: process.env.GRAFICOS_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/graficos': '/api/charts', // Transforma /api/graficos -> /api/charts
  }
}));

// --- Noticias ---
// Asumo que noticias funciona igual que Contenido (rewrite)
app.use('/api/noticias', createProxyMiddleware({
  target: process.env.NOTICIAS_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/noticias': '' } // Borra el prefijo
}));

// Health Check del Gateway
app.get('/api', (req, res) => {
  res.json({ status: 'OK', message: 'API Gateway funcionando 🚀' });
});

// Manejador de Errores Final (JSON Personalizado)
app.use((req, res) => {
  console.log(`⚠️ [404] Ninguna ruta coincidió para: ${req.originalUrl}`);
  res.status(404).json({ error: "Ruta no encontrada en Gateway", path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});