import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V2.4 (FIX RUTA CUENTAS) ---");

// =======================================================================
// 1. SEGURIDAD & LOGS
// =======================================================================
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] ${req.method} ${req.originalUrl}`);
    next();
});

// =======================================================================
// 2. HEALTH CHECK (Rutas prioritarias)
// =======================================================================
app.get('/', (req, res) => res.json({ status: "OK", msg: "Gateway V2.4 Active" }));
app.get('/api/health', (req, res) => res.json({ status: "OK", server: "Gateway Operational" }));


// =======================================================================
// 3. PROXY: SERVICIO CUENTAS (EL CASO ESPECIAL)
// =======================================================================
// Cuentas necesita recibir la URL COMPLETA (/api/auth/login), no la recortada.
const TARGET_CUENTAS = process.env.CUENTAS_URL || 'http://cuentas_container:8082';

app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createProxyMiddleware({
        target: TARGET_CUENTAS,
        changeOrigin: true,
        // ESTA ES LA CORRECCIÓN CLAVE:
        // Usamos pathRewrite para devolver la URL original completa
        pathRewrite: (path, req) => {
            return req.originalUrl; // <--- Envía /api/auth/login en vez de /login
        },
        onProxyRes: (proxyRes, req, res) => {
            // Inyectamos CORS en la respuesta
            const origin = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log(`🚀 [CUENTAS] Enviando FULL URL: ${req.originalUrl}`);
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => {
            console.error(`🔥 [ERROR CUENTAS] ${err.message}`);
            res.status(502).json({ error: 'Microservicio Cuentas no responde' });
        }
    })
);

// =======================================================================
// 4. PROXY: RESTO DE SERVICIOS (Usan Helper estándar)
// =======================================================================
// Estos servicios SÍ necesitan que se recorte o cambie el prefijo.

const createStandardProxy = (target, pathRewriteRule) => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: pathRewriteRule,
        onProxyRes: (proxyRes, req, res) => {
            const origin = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        },
        onProxyReq: (proxyReq, req, res) => {
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
            console.log(`🔌 [OTRO SERVICIO] Enviando a: ${target}${proxyReq.path}`);
        }
    });
};

// GRAFICOS (Graficos -> Charts)
app.use('/api/graficos', createStandardProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092',
    { '^/api/graficos': '/api/charts' }
));

// ADMIN (Borra prefijo)
app.use('/api/admin', createStandardProxy(
    process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
    { '^/api/admin': '' } 
));

// SERVICIOS ESTANDAR (Borran prefijo)
const serviciosSimples = [
    { route: '/api/contenido', target: process.env.CONTENIDO_URL || 'http://contenido_container:8091' },
    { route: '/api/interaccion', target: process.env.INTERACCION_URL || 'http://interaccion_container:8083' },
    { route: '/api/gamificacion', target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084' },
    { route: '/api/traduccion', target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086' },
    { route: '/api/noticias', target: process.env.NOTICIAS_URL || 'http://noticias_container:8093' },
    { route: '/api/puntos', target: process.env.PUNTOS_URL || 'http://puntos_container:8097' },
];

serviciosSimples.forEach(svc => {
    const rule = {};
    rule[`^${svc.route}`] = ''; // Regla para borrar el prefijo
    app.use(svc.route, createStandardProxy(svc.target, rule));
});

// 404 FINAL
app.use((req, res) => {
    console.log(`⚠️ [404] Ruta perdida: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});