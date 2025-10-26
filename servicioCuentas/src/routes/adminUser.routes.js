import { Router } from 'express';
import {
    getAllUsers,
    getUserStats,
    createUserAdmin,
    updateUserAdmin,
    deactivateUserAdmin
} from '../controllers/adminUser.controller.js';
import { authRequired } from '../middleware/validateToken.js';
import { authorizeRole } from '../middleware/validateRole.js';

const router = Router();

//Uso del Middleware, uso solo Admin
router.use(authRequired, authorizeRole('Administrador'));

//RUTAS
router.get('/', getAllUsers);          // GET /api/admin/users
router.get('/stats', getUserStats);    // GET /api/admin/users/stats
router.post('/', createUserAdmin);       // POST /api/admin/users
router.put('/:id', updateUserAdmin);   // PUT /api/admin/users/:id
router.delete('/:id', deactivateUserAdmin); // DELETE /api/admin/users/:id

export default router;