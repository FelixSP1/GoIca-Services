import { Router } from 'express';
import { getPerfil, updatePerfil } from '../controllers/usuarios.controller.js';
import { authRequired } from '../middleware/validateToken.js';

const router = Router();

// Obtener perfil del usuario autenticado
router.get('/perfil', authRequired, getPerfil);

// Actualizar perfil del usuario autenticado
router.put('/perfil', authRequired, updatePerfil);

export default router;
