import { Router } from 'express';
import { crearResena, getAllResenas, getResenasPorLugar} from '../controller/resenas.controller.js';
import { authRequired } from '../middleware/validateToken.js';
import { authorizeRole} from '../middleware/validateRole.js'

const router = Router();

router.get('/lugares/:id/resenas', getResenasPorLugar);
router.post('/resenas', authRequired, crearResena);

router.get('/reviews', authRequired, authorizeRole('Administrador'), getAllResenas)

export default router;