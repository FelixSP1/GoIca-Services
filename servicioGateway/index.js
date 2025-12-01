import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V2.2 (FINAL FIX) ---");

// 1. SEGURIDAD C.O.R.S.
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // Regex fix para Express 5

// 2. LOGGING
app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] ${req.method} ${req.originalUrl}`);
    next();
});

// 3. HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: "OK", message: "Gateway Ready" });
});

// =======================================================================
// 4. CONFIGURACIÓN DE PROXIES
// =======================================================================

const createServiceProxy = (target, pathRewriteRule = null) => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: pathRewriteRule,
        onProxyReq: (proxyReq, req, res) => {
            // Body fix para POST/PUT
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

// --- A. SERVICIO CUENTAS (Sin Rewrite) ---
app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createServiceProxy(
        process.env.CUENTAS_URL || 'http://cuentas_container:8082',
        null 
    )
);

// --- B. SERVICIO GRÁFICOS (FIX DE RUTA) ---
// Express quita '/api/graficos'. Queda '/stats/...'.
// La regla '^/' le pega '/api/charts/' al inicio.
// Resultado final: '/api/charts/stats/...' (Lo que el microservicio quiere)
app.use('/api/graficos', createServiceProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092',
    { '^/': '/api/charts/' } // <--- ESTA ES LA CORRECCIÓN
));

// --- C. SERVICIO ADMINISTRACIÓN (Quita prefijo) ---
app.use('/api/admin', createServiceProxy(
    process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
    { '^/': '/' } // Asegura que empiece limpio
));

// --- D. OTROS SERVICIOS (Quitan prefijo automáticamente) ---
// Nota: Al usar app.use('/api/algo'), Express ya quita el prefijo.
// Solo necesitamos asegurarnos de que no agregue nada raro.
const serviciosSimples = [
    { route: '/api/contenido', target: process.env.CONTENIDO_URL || 'http://contenido_container:8091' },
    { route: '/api/interaccion', target: process.env.INTERACCION_URL || 'http://interaccion_container:8083' },
    { route: '/api/gamificacion', target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084' },
    { route: '/api/traduccion', target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086' },
    { route: '/api/noticias', target: process.env.NOTICIAS_URL || 'http://noticias_container:8093' },
    { route: '/api/puntos', target: process.env.PUNTOS_URL || 'http://puntos_container:8097' },
];

serviciosSimples.forEach(svc => {
    app.use(svc.route, createServiceProxy(svc.target));
});

// 404 FINAL
app.use((req, res) => {
    console.log(`⚠️ [404] Ruta perdida: ${req.originalUrl}`);
    res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});