import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V2.3 (FINAL MASTER) ---");

// =======================================================================
// 1. SEGURIDAD C.O.R.S. (CONFIGURACIÓN HÍBRIDA)
// =======================================================================
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Fix Express 5

// 2. LOGGING DETALLADO
app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] ${req.method} ${req.originalUrl}`);
    next();
});

// 3. HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: "OK", message: "Gateway Activo" });
});

// =======================================================================
// 4. CONFIGURACIÓN DE PROXIES (CON CORRECCIONES)
// =======================================================================

const createServiceProxy = (target, pathRewriteRule = null) => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: pathRewriteRule,
        
        // --- RECUPERAMOS LA INYECCIÓN DE HEADERS (CRUCIAL PARA FRONTEND) ---
        onProxyRes: (proxyRes, req, res) => {
            const origin = req.headers.origin || '*';
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        },
        // ------------------------------------------------------------------

        onProxyReq: (proxyReq, req, res) => {
            // Body fix
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
            console.log(`🔌 [SALIDA] -> ${target}${proxyReq.path}`);
        },
        onError: (err, req, res) => {
            console.error(`🔥 [ERROR] ${target}: ${err.message}`);
            res.status(502).json({ error: 'Microservicio no responde' });
        }
    });
};

// --- A. SERVICIO CUENTAS (Sin Rewrite - Mantiene prefijos) ---
app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createServiceProxy(
        process.env.CUENTAS_URL || 'http://cuentas_container:8082',
        null 
    )
);

// --- B. SERVICIO GRÁFICOS (Rewrite Especial) ---
// Traduce /api/graficos -> /api/charts
app.use('/api/graficos', createServiceProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092',
    { '^/': '/api/charts/' }
));

// --- C. SERVICIO ADMINISTRACIÓN (Quita prefijo) ---
// Traduce /api/admin -> /
app.use('/api/admin', createServiceProxy(
    process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
    { '^/api/admin': '' } 
));

// --- D. OTROS SERVICIOS (Quitan prefijo automáticamente) ---
const serviciosSimples = [
    { route: '/api/contenido', target: process.env.CONTENIDO_URL || 'http://contenido_container:8091' },
    { route: '/api/interaccion', target: process.env.INTERACCION_URL || 'http://interaccion_container:8083' },
    { route: '/api/gamificacion', target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084' },
    { route: '/api/traduccion', target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086' },
    { route: '/api/noticias', target: process.env.NOTICIAS_URL || 'http://noticias_container:8093' },
    { route: '/api/puntos', target: process.env.PUNTOS_URL || 'http://puntos_container:8097' },
];

serviciosSimples.forEach(svc => {
    // --- CORRECCIÓN AQUÍ: CALCULAMOS LA REGLA DE REWRITE ---
    // Antes enviábamos 'null', por eso fallaban. Ahora enviamos la regla para borrar el prefijo.
    const rule = {};
    rule[`^${svc.route}`] = ''; // Ej: {'^/api/contenido': ''}
    
    app.use(svc.route, createServiceProxy(svc.target, rule));
});

// 404 FINAL
app.use((req, res) => {
    console.log(`⚠️ [404] Ruta perdida: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});