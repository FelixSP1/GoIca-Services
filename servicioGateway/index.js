import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 8080

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log para depurar
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
  next();
});

// === Microservicio de Contenido ===
app.use('/api/contenido', createProxyMiddleware({
  target: 'http://localhost:8091',
  changeOrigin: true
}));

// === Microservicio de Cuentas ===
const cuentasProxyOptions = {
  proxyReqPathResolver: (req) => {
    const parts = req.originalUrl.split('/'); // e.g., ['', 'api', 'admin', 'socios', 'stats']
    let destinationPath = req.originalUrl; // Default
    if (parts.length >= 3) {
      const servicePrefix = parts[2]; // 'auth', 'socio', 'user', or 'admin'
      if (servicePrefix === 'admin' && parts[3] === 'users') {
        destinationPath = `/api/admin/users${req.url}`;
      } else if (servicePrefix === 'admin' && parts[3] === 'socios') { // <-- Handle admin/socios
        destinationPath = `/api/admin/socios${req.url}`;
      }
      else if (['auth', 'socio', 'user'].includes(servicePrefix)) {
        destinationPath = `/api/${servicePrefix}${req.url}`;
      }
    }
    console.log(`[Gateway] -> Cuentas: http://localhost:8082${destinationPath}`);
    return destinationPath;
  },
  proxyErrorHandler: (err, res, next) => { /* ... error handler ... */ }
};
app.use('/api/auth', proxy('http://localhost:8082', cuentasProxyOptions));
app.use('/api/socio', proxy('http://localhost:8082', cuentasProxyOptions));
app.use('/api/user', proxy('http://localhost:8082', cuentasProxyOptions));
app.use('/api/admin/users', proxy('http://localhost:8082', cuentasProxyOptions));
app.use('/api/admin/socios', proxy('http://localhost:8082', cuentasProxyOptions));

// === Microservicio de Interacción ===
app.use('/api/interaccion', createProxyMiddleware({
  target: 'http://localhost:8083',
  changeOrigin: true
}));

// === Microservicio de Gamificación ===
app.use('/api/gamificacion', createProxyMiddleware({
  target: 'http://localhost:8084',
  changeOrigin: true
}));

// === Microservicio de Administración ===
app.use('/api/admin', createProxyMiddleware({
  target: 'http://localhost:8085',
  changeOrigin: true,
  // Optional: Add pathRewrite if servicioAdministracion doesn't expect /api/admin prefix
  // pathRewrite: { '^/api/admin': '' },
  onError: (err, req, res) => {
    console.error('[Gateway AdminGeneral Error]', err);
    res.status(502).json({ error: 'Bad Gateway - Error communicating with Servicio Administracion' });
  }
}));

// === Microservicio de Traducción ===
app.use('/api/traduccion', createProxyMiddleware({
  target: 'http://localhost:8086',
  changeOrigin: true
}));

// Ruta de prueba del Gateway
app.get('/api', (req, res) => {
  res.json({ message: 'API Gateway activo y funcionando correctamente 🚀' });
});

app.listen(PORT, () => {
  console.log(`API Gateway ejecutándose en el puerto ${PORT}`);
});