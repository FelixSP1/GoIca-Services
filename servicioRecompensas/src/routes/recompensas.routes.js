// servicio-gamificacion/src/routes/recompensas.routes.js

import { Router } from 'express';

// --- Importa los Middlewares de Seguridad ---
// Asegúrate de que copiaste estos archivos en 'src/middleware/'
import { authRequired } from '../middleware/validatedtoken.js';
import { authorizeRole } from '../middleware/validateRole.js';

// --- Importa TODAS las funciones del controlador ---
import {
  getRecompensas,
  getPuntosUsuario,
  canjearRecompensa,
  checkIn,
  getSocioStats,
  getSocioCanjesPorMes,
  getSocioCanjesEstado,
  getSocioTopUsuarios,
  createRecompensa,
  updateRecompensa,
  deleteRecompensa,
  getMisRecompensas,
  getSocioResenas,  // Nombre corregido (Socio en singular)
  deleteSocioResena,
  getHistorialPuntos
} from '../controller/recompensas.controller.js';

const router = Router();

// --- Rutas Públicas/Usuario ---
router.get('/recompensas', getRecompensas);
router.get('/puntos', authRequired, getPuntosUsuario);
router.post('/recompensas/canjear', authRequired, canjearRecompensa);
router.post('/check-in', authRequired, checkIn);
router.get('/historial', authRequired, getHistorialPuntos);


// --- RUTAS DEL DASHBOARD DE SOCIO ---
// Aquí creamos un "mini-router" solo para las rutas de socio

const socioRouter = Router();

// 1. Aplicamos la seguridad a TODAS las rutas de este mini-router
// Ahora, cualquier ruta que empiece por /socio requerirá un token de "Socio"
socioRouter.use(authRequired, authorizeRole('Socio'));

// 2. Definimos las rutas específicas del socio
socioRouter.get('/stats', getSocioStats);
socioRouter.get('/canjes-por-mes', getSocioCanjesPorMes);
socioRouter.get('/canjes-estado', getSocioCanjesEstado);
socioRouter.get('/top-usuarios', getSocioTopUsuarios);

// Rutas CRUD de Recompensas del Socio
socioRouter.get('/recompensas', getMisRecompensas);
socioRouter.post('/recompensas', createRecompensa);
socioRouter.put('/recompensas/:id', updateRecompensa);
socioRouter.delete('/recompensas/:id', deleteRecompensa);

// Rutas de Gestión de Reseñas del Socio
socioRouter.get('/resenas', getSocioResenas);
socioRouter.delete('/resenas/:id', deleteSocioResena);


// 3. Montamos el mini-router de socio en la ruta principal '/socio'
// Esto crea las rutas: /socio/stats, /socio/recompensas, etc.
router.use('/socio', socioRouter);


export default router;