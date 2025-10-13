import { Router } from 'express';
import { crearResena, getResenasPorLugar} from '../controller/resenas.controller.js';
import { authRequired } from '../middleware/validatetoken.js';

const router = Router();

router.get('/lugares/:id/resenas', getResenasPorLugar);
router.post('/resenas', authRequired, crearResena);

export default router;