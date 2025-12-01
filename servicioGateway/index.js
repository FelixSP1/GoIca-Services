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
// SERVICIO CUENTAS (Arreglo de Ruta Recortada)
// =======================================================================
const TARGET_CUENTAS = 'http://cuentas_container:8082';

console.log("--> Configurando Rutas de Cuentas hacia:", TARGET_CUENTAS);

// Usamos una expresión regular para capturar el grupo '/api/auth' y otros
app.use(
  ['/api/auth', '/api/socio', '/api/user', '/api/admin'], 
  createProxyMiddleware({
    target: TARGET_CUENTAS,
    changeOrigin: true,
    // TRUCO MAESTRO:
    // Express recorta la URL (ej. envía '/login').
    // Aquí le decimos: "Al principio de la URL (^), agrega de nuevo la ruta original que recortaste".
    pathRewrite: (path, req) => {
       // Usamos req.baseUrl que contiene la parte recortada ('/api/auth')
       // y la unimos con el path ('/login')
       return req.baseUrl + path; 
    },
    onProxyReq: (proxyReq, req, res) => {
       console.log(`🚀 [PROXY SALIENTE] Enviando a Cuentas (Full URL): ${req.baseUrl}${req.url}`);
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
// SERVICIO ADMINISTRACIÓN (Con Rewrite)
// =======================================================================
// Hardcodeamos la dirección para asegurar conexión
const TARGET_ADMIN = 'http://administracion_container:8085';

console.log("--> Configurando Admin hacia:", TARGET_ADMIN);

app.use('/api/admin', createProxyMiddleware({
  target: TARGET_ADMIN,
  changeOrigin: true,
  // ESTO ES LO QUE FALTABA: Borrar '/api/admin' para que llegue solo '/lugares'
  pathRewrite: { 
    '^/api/admin': '' 
  },
  onProxyReq: (proxyReq, req, res) => {
     // Si es POST/PUT, arreglamos el body (por si acaso)
     if (req.body) {
       const bodyData = JSON.stringify(req.body);
       proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
       proxyReq.write(bodyData);
     }
     console.log(`🚀 [PROXY -> ADMIN] Enviando: ${req.url}`);
  },
  onError: (err, req, res) => {
     console.error('[ERROR -> ADMIN]', err.message);
     res.status(500).json({ error: 'Fallo conexión Admin', msg: err.message });
  }
}));


// =======================================================================
// SERVICIO GRÁFICOS
// =======================================================================
app.use('/api/graficos', createProxyMiddleware({
  target: process.env.GRAFICOS_URL || 'http://graficos_container:8092',
  changeOrigin: true,
  // Asumo que gráficos también espera la ruta limpia (ej. /dashboard)
  pathRewrite: { '^/api/graficos': '' }, 
  onProxyReq: (proxyReq, req, res) => {
     console.log(`🚀 [PROXY -> GRAFICOS] Enviando: ${req.url}`);
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