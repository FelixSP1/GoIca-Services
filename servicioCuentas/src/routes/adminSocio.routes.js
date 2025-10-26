import { Router } from 'express';
import {
    getAllSociosAdmin,
    getSocioStatsAdmin,
    createSocioAdmin,
    updateSocioAdmin,
    deactivateSocioAdmin
} from '../controllers/adminSocio.controller.js';
import { authRequired } from '../middleware/validateToken.js';
import { authorizeRole } from '../middleware/validateRole.js';

const router = Router();

router.use(authRequired, authorizeRole('Administrador'));

router.get('/', getAllSociosAdmin);         // GET /api/admin/socios
router.get('/stats', getSocioStatsAdmin);   // GET /api/admin/socios/stats
router.post('/', createSocioAdmin);        // POST /api/admin/socios
router.put('/:id', updateSocioAdmin);    // PUT /api/admin/socios/:id
router.delete('/:id', deactivateSocioAdmin); // DELETE /api/admin/socios/:id

export default router;