import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V4.1 (GRAFICOS FIX) ---");

// 1. SEGURIDAD C.O.R.S.
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// 2. LOGGING Y SALUD
app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/', (req, res) => res.json({ status: "OK", msg: "Gateway Active" }));
app.get('/api/health', (req, res) => res.json({ status: "OK" }));

// =======================================================================
// HELPER: INYECCIÓN DE CORS EN RESPUESTA
// =======================================================================
const onProxyResFix = (proxyRes, req, res) => {
    const origin = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
};

// =======================================================================
// A. SERVICIO CUENTAS (Complejo - Usa ruta original)
// =======================================================================
app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createProxyMiddleware({
        target: process.env.CUENTAS_URL || 'http://cuentas_container:8082',
        changeOrigin: true,
        pathRewrite: (path, req) => req.originalUrl, // Mantiene la URL completa
        onProxyRes: onProxyResFix,
        onProxyReq: (proxyReq, req, res) => {
             console.log(`🚀 [CUENTAS] Enviando: ${req.originalUrl}`);
        },
        onError: (err, req, res) => {
            console.error(`🔥 [ERROR CUENTAS] ${err.message}`);
            res.status(502).json({ error: 'Fallo Cuentas' });
        }
    })
);

// =======================================================================
// B. SERVICIOS SIMPLES (Función Helper)
// =======================================================================
const createSimpleProxy = (target, rewriteKey, rewriteValue = '') => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: { [rewriteKey]: rewriteValue },
        onProxyRes: onProxyResFix,
        onProxyReq: (proxyReq, req, res) => {
             console.log(`🚀 [PROXY] -> ${target}${proxyReq.path}`);
        },
        onError: (err, req, res) => {
            console.error(`🔥 [ERROR PROXY] ${err.message}`);
            res.status(502).json({ error: 'Microservicio no responde' });
        }
    });
};

// --- GRÁFICOS (FIX: Usamos ^/ porque Express ya recortó el prefijo) ---
// Entra: /api/graficos/stats -> Express deja: /stats -> Rewrite agrega: /api/charts/stats
app.use('/api/graficos', createSimpleProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092', 
    '^/',           // <--- CORRECCIÓN AQUÍ
    '/api/charts/'  // <--- CORRECCIÓN AQUÍ
));

// --- ADMIN Y OTROS (Borran prefijo) ---
app.use('/api/admin', createSimpleProxy(process.env.ADMINISTRACION_URL || 'http://administracion_container:8085', '^/api/admin'));
app.use('/api/contenido', createSimpleProxy(process.env.CONTENIDO_URL || 'http://contenido_container:8091', '^/api/contenido'));
app.use('/api/interaccion', createSimpleProxy(process.env.INTERACCION_URL || 'http://interaccion_container:8083', '^/api/interaccion'));
app.use('/api/gamificacion', createSimpleProxy(process.env.GAMIFICACION_URL || 'http://recompensas_container:8084', '^/api/gamificacion'));
app.use('/api/traduccion', createSimpleProxy(process.env.TRADUCCION_URL || 'http://traduccion_container:8086', '^/api/traduccion'));
app.use('/api/noticias', createSimpleProxy(process.env.NOTICIAS_URL || 'http://noticias_container:8093', '^/api/noticias'));
app.use('/api/puntos', createSimpleProxy(process.env.PUNTOS_URL || 'http://puntos_container:8097', '^/api/puntos'));

// 404 FINAL
app.use((req, res) => {
    console.log(`⚠️ [404] Ruta perdida: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});