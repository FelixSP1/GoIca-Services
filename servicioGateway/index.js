import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 8089;

console.log("--- 🚀 INICIANDO GATEWAY V2.0 (DEBUG MODE) ---");

// =======================================================================
// 1. SEGURIDAD C.O.R.S. (CONFIGURACIÓN ROBUSTA)
// =======================================================================
const corsOptions = {
  origin: true, // Refleja el origen de la petición (acepta a tu frontend v2)
  credentials: true, // PERMITE cookies y headers de autorización
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Access-Control-Allow-Origin'
  ]
};

// Aplicar CORS a todas las rutas
app.use(cors(corsOptions));

// IMPORTANTE: Responder a las peticiones PREFLIGHT (OPTIONS) antes de nada
app.options('(.*)', cors(corsOptions));

// 2. LOGGING DETALLADO (Para ver qué llega exactamente)
app.use((req, res, next) => {
    console.log(`\n📥 [ENTRADA] Método: ${req.method} | URL Original: ${req.originalUrl}`);
    next();
});

// 3. HEALTH CHECK (Ruta de prueba prioritaria)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Gateway activo y escuchando", 
        timestamp: new Date().toISOString() 
    });
});

// =======================================================================
// 4. CONFIGURACIÓN DE PROXIES
// =======================================================================

// Función auxiliar para configurar proxies comunes
const createServiceProxy = (target, pathRewriteRule = null) => {
    return createProxyMiddleware({
        target: target,
        changeOrigin: true,
        pathRewrite: pathRewriteRule,
        onProxyReq: (proxyReq, req, res) => {
            // Log para ver a dónde se está yendo realmente la petición
            console.log(`🔌 [PROXY SALIENTE] Hacia: ${target}${proxyReq.path}`);
            
            // Fix para Body Parsing (si usas POST/PUT)
            if (req.body && Object.keys(req.body).length > 0) {
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => {
            console.error(`🔥 [ERROR PROXY] Falló conexión a ${target}: ${err.message}`);
            res.status(502).json({ error: 'Bad Gateway - El microservicio no responde', details: err.message });
        }
    });
};

// --- A. SERVICIO CUENTAS ---
// Si tu microservicio espera recibir "/api/auth/login", NO uses pathRewrite.
// Si espera "/auth/login", usa pathRewrite para quitar "/api".
// Asumiremos que el microservicio Cuentas YA tiene los prefijos definidos en su código.
app.use(
    ['/api/auth', '/api/socio', '/api/user', '/api/admin/users', '/api/admin/socios'],
    createServiceProxy(
        process.env.CUENTAS_URL || 'http://cuentas_container:8082',
        null // No reescribimos nada, se envía tal cual llega.
    )
);

// --- B. ADMINISTRACIÓN (Quita /api/admin) ---
app.use('/api/admin', createServiceProxy(
    process.env.ADMINISTRACION_URL || 'http://administracion_container:8085',
    { '^/api/admin': '' } // De "/api/admin/lugares" pasa a "/lugares"
));

// --- C. SERVICIO GRÁFICOS ---
app.use('/api/graficos', createServiceProxy(
    process.env.GRAFICOS_URL || 'http://graficos_container:8092',
    { '^/api/graficos': '/api/charts' } // Traducción específica
));

// --- D. OTROS SERVICIOS (Quitan prefijo) ---
const serviciosSimples = [
    { route: '/api/contenido', target: process.env.CONTENIDO_URL || 'http://contenido_container:8091' },
    { route: '/api/interaccion', target: process.env.INTERACCION_URL || 'http://interaccion_container:8083' },
    { route: '/api/gamificacion', target: process.env.GAMIFICACION_URL || 'http://recompensas_container:8084' },
    { route: '/api/traduccion', target: process.env.TRADUCCION_URL || 'http://traduccion_container:8086' },
    { route: '/api/noticias', target: process.env.NOTICIAS_URL || 'http://noticias_container:8093' },
    { route: '/api/puntos', target: process.env.PUNTOS_URL || 'http://puntos_container:8097' },
];

serviciosSimples.forEach(svc => {
    // La regla dinámica: '^/api/nombre' -> ''
    const rewriteRule = {};
    rewriteRule[`^${svc.route}`] = ''; 
    
    app.use(svc.route, createServiceProxy(svc.target, rewriteRule));
});

// =======================================================================
// MANEJADOR DE ERRORES FINAL
// =======================================================================
app.use((req, res) => {
    console.log(`⚠️ [404 FINAL] No se encontró ruta para: ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada en API Gateway', 
        path: req.originalUrl,
        tip: 'Verifica que la URL incluya el prefijo correcto (ej: /api/auth/...)' 
    });
});

app.listen(PORT, () => {
    console.log(`✅ Gateway escuchando en puerto ${PORT}`);
});