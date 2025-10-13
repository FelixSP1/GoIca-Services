import { Router } from 'express';
import { authRequired } from '../middleware/validatedtoken.js';
import { getPuntosUsuario, getRecompensas, canjearRecompensa, checkIn } from '../controller/recompensas.controller.js';

const router = Router();

router.get('/recompensas', getRecompensas);

router.get('/puntos', authRequired, getPuntosUsuario);
router.get('/recompensas/canjear', authRequired, canjearRecompensa);

router.post('/check-in', authRequired, checkIn);

export default router;