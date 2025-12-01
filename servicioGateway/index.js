import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

app.use(cors());

// Log global para depurar (Te mostrará en la consola de Dokploy qué ruta entra y a cuál sale)
app.use((req, res, next) => {
  console.log(`[GATEWAY REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// =======================================================================
// GRUPO 1: SERVICIO CUENTAS
// Este servicio YA TIENE prefijos /api/... en su código interno.
// Por lo tanto, NO usamos pathRewrite. Pasamos la URL tal cual.
// =======================================================================
const cuentasTarget = process.env.CUENTAS_URL; // http://cuentas:8082

// Rutas de Cuentas (Auth, Socio, User, Admin)
// Al no poner 'pathRewrite', si llega /api/auth/login, envía /api/auth/login. ¡Justo lo que cuentas espera!
app.use(['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'], createProxyMiddleware({
  target: cuentasTarget,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
     console.log(`[PROXY -> CUENTAS] Enviando a: ${cuentasTarget}${req.originalUrl}`);
  },
  onError: (err, req, res) => {
     console.error('[ERROR -> CUENTAS]', err.message);
     res.status(500).json({ error: 'El servicio de Cuentas no responde.' });
  }
}));

// =======================================================================
// GRUPO 2: SERVICIO CONTENIDO (y otros que montan en Raíz '/')
// Estos servicios esperan recibir /lugares, NO /api/contenido/lugares.
// AQUÍ SÍ USAMOS pathRewrite para borrar el prefijo.
// =======================================================================

// --- Contenido ---
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL, // http://contenido:8091
  changeOrigin: true,
  pathRewrite: {
    '^/api/contenido': '', // Borra /api/contenido de la URL
  },
  onProxyReq: (proxyReq, req, res) => {
     // Aquí verás que la URL ya no tiene /api/contenido
     console.log(`[PROXY -> CONTENIDO] Enviando a: ${process.env.CONTENIDO_URL} (Ruta reescrita)`);
  },
  onError: (err, req, res) => {
     console.error('[ERROR -> CONTENIDO]', err.message);
     res.status(500).json({ error: 'El servicio de Contenido no responde.' });
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

app.listen(PORT, () => {
  console.log(`API Gateway escuchando en el puerto ${PORT}`);
});