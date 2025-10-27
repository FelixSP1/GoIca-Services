// servicioCuentas/src/routes/auth.route.js
import { Router } from 'express';
// Solo importamos lo necesario de auth.controller
import { 
    register, 
    login // Mantenemos esta si quieres una ruta para perfil de usuario normal
} from '../controllers/auth.controller.js';

import {updateProfile, getUserProfile} from '../controllers/user.controller.js'
// (Si moviste updateProfile a user.controller.js, impórtalo desde ahí)

import { authRequired } from '../middleware/validateToken.js';

const router = Router();

// --- Rutas de Autenticación (Públicas) ---
router.post('/register', register);
router.post('/login', login);

// --- Ruta de Perfil de USUARIO GENERAL (Opcional) ---
// Obtiene y actualiza la tabla 'usuarios' (nombre, apellidos, etc.)
router.get('/perfil', authRequired, getUserProfile);
router.put('/perfil', authRequired, updateProfile); 
// ¡OJO! Esta ruta '/perfil' es diferente a '/socio/perfil'

router.get('/test', (req, res) => {
  res.json({ message: 'Servicio Cuentas activo y accesible desde Gateway' });
});

export default router;