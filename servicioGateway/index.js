import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V5.1 (MASTER FINAL) ---");

// =======================================================================
// 1. SEGURIDAD C.O.R.S. (BLINDADO)
// =======================================================================
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
// Fix para Express 5 (Usamos Regex en lugar de string '*')
app.options(/.*/, cors(corsOptions)); 

// 2. LOGGING Y SALUD
app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] ${req.method} ${req.originalUrl}`);
    next();
});

app.get('/', (req, res) => res.json({ status: "OK", msg: "Gateway V5.1 Active" }));
app.get('/api/health', (req, res) => res.json({ status: "OK" }));

// =======================================================================
// HELPER: INYECCIÓN MANUAL DE HEADERS CORS
// =======================================================================
const onProxyResFix = (proxyRes, req, res) => {
    const origin = req.headers.origin || '*';
    proxyRes.headers['Access-Control-Allow-Origin'] = origin;
    proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
};

// =======================================================================
// A. SERVICIOS QUE NECESITAN RUTA COMPLETA (NO RECORTAR)
// =======================================================================
// Estos microservicios tienen 'app.use(/api/algo)' internamente,
// por lo que necesitan recibir la URL entera.

app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios', '/api/noticias'],
    createProxyMiddleware({
        // Usamos un router function para decidir el target dinámicamente o variables separadas
        router: (req) => {
            if (req.originalUrl.includes('/api/noticias')) {
                return process.env.NOTICIAS_URL || 'http://noticias_container:8093';
            }
            // Por defecto va a Cuentas
            return process.env.CUENTAS_URL || 'http://cuentas_container:8082';
        },
        changeOrigin: true,
        // CLAVE: Enviamos la URL original completa
        pathRewrite: (path, req) => req.originalUrl,
        onProxyRes: onProxyResFix,
        onProxyReq: (proxyReq, req, res) => {
             console.log(`🚀 [FULL PATH PROXY] Enviando: ${req.originalUrl}`);
             // Body fix para POST/PUT
             if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => res.status(502).json({ error: 'Microservicio FullPath no responde', detail: err.message })
    })
);

// =======================================================================
// B. SERVICIOS SIMPLES (RECORTAN PREFIJO AUTOMÁTICAMENTE)
// =======================================================================
// Express ya quita el prefijo '/api/xxx'. El proxy recibe lo que sobra.

const createSimpleProxy = (target, rewriteKey = null, rewriteValue = '') => {
    const rewriteConfig = rewriteKey ? { [rewriteKey]: rewriteValue } : undefined;
    
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: rewriteConfig,
        onProxyRes: onProxyResFix,
        onProxyReq: (proxyReq, req, res) => {
             console.log(`🚀 [SIMPLE PROXY] -> ${target}${proxyReq.path}`);
             if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => res.status(502).json({ error: 'Microservicio Simple no responde' })
    });
};

// GRÁFICOS (Recorta -> Agrega /api/charts/)
app.use('/api/graficos', createSimpleProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092', 
    '^/', '/api/charts/'
));

// ADMIN (Recorta /api/admin -> Queda limpio)
app.use('/api/admin', createSimpleProxy(
    process.env.ADMINISTRACION_URL || 'http://administracion_container:8085', 
    '^/api/admin', ''
));

// OTROS (Recortan su propio prefijo automáticamente gracias a app.use)
app.use('/api/contenido', createSimpleProxy(process.env.CONTENIDO_URL || 'http://contenido_container:8091'));
app.use('/api/interaccion', createSimpleProxy(process.env.INTERACCION_URL || 'http://interaccion_container:8083'));
app.use('/api/gamificacion', createSimpleProxy(process.env.GAMIFICACION_URL || 'http://recompensas_container:8084'));
app.use('/api/traduccion', createSimpleProxy(process.env.TRADUCCION_URL || 'http://traduccion_container:8086'));
app.use('/api/puntos', createSimpleProxy(process.env.PUNTOS_URL || 'http://puntos_container:8097'));


// 404 FINAL
app.use((req, res) => {
    console.log(`⚠️ [404] Ruta perdida: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});