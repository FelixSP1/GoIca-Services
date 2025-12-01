import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

// --- DIAGNÓSTICO AL INICIO ---
console.log("--- INICIANDO GATEWAY ---");
console.log("CUENTAS_URL detectada:", process.env.CUENTAS_URL || "¡VACÍA/UNDEFINED! ⚠️");
console.log("CONTENIDO_URL detectada:", process.env.CONTENIDO_URL || "¡VACÍA/UNDEFINED! ⚠️");
// -----------------------------

app.use(cors({
  origin: '*', // Permitir todo por ahora para descartar CORS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


// Log de entrada
app.use((req, res, next) => {
  console.log(`[GATEWAY IN] ${req.method} ${req.originalUrl}`);
  next();
});

// =======================================================================
// SERVICIO CUENTAS (Definición Explícita)
// =======================================================================
const cuentasTarget = process.env.CUENTAS_URL;

if (!cuentasTarget) {
  console.error("❌ ERROR CRÍTICO: No existe la variable CUENTAS_URL");
}

// Proxy específico para Auth (Login/Register)
app.use('/api/auth', createProxyMiddleware({
  target: cuentasTarget, // http://cuentas_container:8082
  changeOrigin: true,
  // No usamos pathRewrite porque Cuentas espera /api/auth
  onProxyReq: (proxyReq, req, res) => {
     console.log(`[PROXY -> CUENTAS] Enviando Login a: ${cuentasTarget}${req.originalUrl}`);
  },
  onError: (err, req, res) => {
     console.error('[ERROR -> CUENTAS]', err.message);
     res.status(500).json({ error: 'Fallo al conectar con Cuentas', details: err.message });
  }
}));

// Proxy para el resto de Cuentas
app.use(['/api/socio', '/api/user', '/api/admin/users'], createProxyMiddleware({
  target: cuentasTarget,
  changeOrigin: true
}));

// =======================================================================
// SERVICIO CONTENIDO (Con Rewrite)
// =======================================================================
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/contenido': '' }, // Borra el prefijo
  onProxyReq: (proxyReq, req, res) => {
     console.log(`[PROXY -> CONTENIDO] URL final: ${process.env.CONTENIDO_URL}${req.url}`);
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

// --- MANEJADOR DE 404 DEL GATEWAY ---
// Si la petición llega aquí, es que ninguna ruta de arriba coincidió
app.use((req, res) => {
  console.log(`[GATEWAY 404] No encontré ruta para: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada en el Gateway', 
    path: req.originalUrl,
    variables_status: {
        cuentas: process.env.CUENTAS_URL ? 'OK' : 'MISSING'
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});