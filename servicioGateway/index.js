import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 8089

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
app.use('/api/auth', proxy('http://localhost:8082', {
  proxyReqPathResolver: (req) => {
    const destino = `/api/auth${req.url}`; // 👈 agrega nuevamente /api/auth
    console.log(`[Gateway] -> Redirigiendo a: http://localhost:8082${destino}`);
    return destino;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('[Gateway Error]', err);
    res.status(500).json({ error: 'Error comunicando con Servicio Cuentas', detalle: err.message });
  }
}));

app.use('/api/socio', proxy('http://localhost:8082', {
  proxyReqPathResolver: (req) => {
    const destino = `/api/socio${req.url}`; // 👈 agrega nuevamente /api/auth
    console.log(`[Gateway] -> Redirigiendo a: http://localhost:8082${destino}`);
    return destino;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('[Gateway Error]', err);
    res.status(500).json({ error: 'Error comunicando con Servicio Cuentas', detalle: err.message });
  }
}));

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
  changeOrigin: true
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