import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V4.0 (MASTER FIX) ---");

// 1. MIDDLEWARE MANUAL DE CORS (Fuerza bruta para asegurar que pase)
app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Log de entrada
app.use((req, res, next) => {
    console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
    next();
});

// =======================================================================
// HELPER PARA INYECTAR HEADERS CORS EN LA RESPUESTA
// =======================================================================
const onProxyResFix = (proxyRes, req, res) => {
    const origin = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
};

// =======================================================================
// 1. SERVICIO CUENTAS (EL IMPORTANTE)
// =======================================================================
// Necesita pathRewrite especial para NO perder el prefijo /api/auth
app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createProxyMiddleware({
        target: process.env.CUENTAS_URL || 'http://cuentas_container:8082',
        changeOrigin: true,
        // ESTA ES LA LÍNEA QUE FALTABA EN LA V3:
        pathRewrite: (path, req) => req.baseUrl + path, 
        onProxyRes: onProxyResFix, // Inyectamos CORS a la salida
        onProxyReq: (proxyReq, req, res) => {
             console.log(`🚀 [CUENTAS] Enviando: ${req.baseUrl}${req.url}`);
             // Body fix
             if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    })
);

// =======================================================================
// 2. OTROS SERVICIOS (Con Rewrite estándar)
// =======================================================================

// Función para crear proxies simples que borran el prefijo
const createSimpleProxy = (target, rewriteKey, rewriteValue = '') => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: { [rewriteKey]: rewriteValue },
        onProxyRes: onProxyResFix,
        onProxyReq: (proxyReq, req) => {
             console.log(`🚀 [PROXY] Enviando a: ${target}${proxyReq.path}`);
             if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        }
    });
};

// GRAFICOS (Graficos -> Charts)
app.use('/api/graficos', createSimpleProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092', 
    '^/api/graficos', 
    '/api/charts'
));

// ADMIN, CONTENIDO, ETC (Borran prefijo)
app.use('/api/admin', createSimpleProxy(process.env.ADMINISTRACION_URL || 'http://administracion_container:8085', '^/api/admin'));
app.use('/api/contenido', createSimpleProxy(process.env.CONTENIDO_URL || 'http://contenido_container:8091', '^/api/contenido'));
app.use('/api/noticias', createSimpleProxy(process.env.NOTICIAS_URL || 'http://noticias_container:8093', '^/api/noticias'));
app.use('/api/interaccion', createSimpleProxy(process.env.INTERACCION_URL || 'http://interaccion_container:8083', '^/api/interaccion'));
app.use('/api/gamificacion', createSimpleProxy(process.env.GAMIFICACION_URL || 'http://recompensas_container:8084', '^/api/gamificacion'));
app.use('/api/traduccion', createSimpleProxy(process.env.TRADUCCION_URL || 'http://traduccion_container:8086', '^/api/traduccion'));
app.use('/api/puntos', createSimpleProxy(process.env.PUNTOS_URL || 'http://puntos_container:8097', '^/api/puntos'));

// RUTAS DE SALUD
app.get('/', (req, res) => res.json({ status: "OK", msg: "Gateway V4 Active" }));
app.get('/api/health', (req, res) => res.json({ status: "OK" }));

app.listen(PORT, () => {
    console.log(`✅ Gateway V4 escuchando en puerto ${PORT}`);
});