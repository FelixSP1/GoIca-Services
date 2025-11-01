import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 8089

app.use(cors());

// Log para depurar
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
  next();
});

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
      else if (['auth', 'socio', 'user', 'usuarios'].includes(servicePrefix)) {
        destinationPath = `/api/${servicePrefix}${req.url}`;
      }
    }
    console.log(`[Gateway] -> Cuentas: http://localhost:8082${destinationPath}`);
    return destinationPath;
  },
  proxyErrorHandler: (err, res, next) => { /* ... error handler ... */ }
};
app.use('/api/auth', proxy(process.env.CUENTAS_URL, cuentasProxyOptions));
app.use('/api/socio', proxy(process.env.CUENTAS_URL, cuentasProxyOptions));
app.use('/api/user', proxy(process.env.CUENTAS_URL, cuentasProxyOptions));
app.use('/api/admin/users', proxy(process.env.CUENTAS_URL, cuentasProxyOptions));
app.use('/api/admin/socios', proxy(process.env.CUENTAS_URL, cuentasProxyOptions));

// === Microservicio de Administración ===
app.use('/api/admin', createProxyMiddleware({
  target: process.env.ADMINISTRACION_URL,
  changeOrigin: true,
  selfHandleResponse: false, // no interceptar respuesta
  onProxyReq: (proxyReq, req, res) => {
    // Reenvía el body si fue parseado
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onError: (err, req, res) => {
    console.error('[Gateway -> Admin Error]', err.message);
    res.status(502).json({ error: 'Bad Gateway - Servicio Administración no disponible' });
  }
}));

// === Microservicio de Contenido ===
app.use('/api/contenido', createProxyMiddleware({
  target: process.env.CONTENIDO_URL,
  changeOrigin: true
}));

// === Microservicio de Interacción ===
app.use('/api/interaccion', createProxyMiddleware({
  target: process.env.INTERACCION_URL,
  changeOrigin: true
}));

// === Microservicio de Gamificación ===
app.use('/api/gamificacion', createProxyMiddleware({
  target: process.env.GAMIFICACION_URL,
  changeOrigin: true
}));



// === Microservicio de Traducción ===
app.use('/api/traduccion', createProxyMiddleware({
  target: process.env.TRADUCCION_URL,
  changeOrigin: true
}));

// === Microservicio de Gráficos ===
const graficosProxyOptions = {
  proxyReqPathResolver: (req) => {
      const destinationPath = `/api/charts${req.url}`; 
      console.log(`[Gateway] -> Gráficos: http://localhost:8092${destinationPath}`);
      return destinationPath;
  },
};
app.use('/api/graficos', proxy(process.env.GRAFICOS_URL, graficosProxyOptions));

// === Microservicio de Noticias ===
const noticiasProxyOptions = {
  proxyReqPathResolver: (req) => {
      const destinationPath = req.originalUrl; 
      console.log(`[Gateway] -> Noticias: http://localhost:8093${destinationPath}`);
      return destinationPath;
  },
};

app.use('/api/noticias', proxy(process.env.NOTICIAS_URL, noticiasProxyOptions));

// Ruta de prueba del Gateway
app.get('/api', (req, res) => {
  res.json({ message: 'API Gateway activo y funcionando correctamente 🚀' });
});

app.listen(PORT, () => {
  console.log(`API Gateway ejecutándose en el puerto ${PORT}`);
});