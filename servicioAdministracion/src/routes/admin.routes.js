import { Router } from "express";
import {
    createLugar,
    deactivateLugarAdmin,
    uploadImage,
    deleteResenaAdmin,
    getResenasStats,
    getAllRewardsAdmin,
    getRewardStatsAdmin,
    createRewardAdmin,
    updateRewardAdmin,
    deactivateRewardAdmin,
    getLugarStatsAdmin,
    getAllLugaresAdmin,
    updateLugarAdmin
} from '../controllers/admin.controller.js';
import upload from "../config/upload.js";
import { authRequired } from '../middleware/validatedtoken.js';
import { authorizeRole } from '../middleware/validateRole.js';

const router = Router();

//Control de Acceso - Solo ADMIN
router.use(authRequired, authorizeRole('Administrador'));

//GESTION LUGARES
router.get('/lugares', getAllLugaresAdmin);
router.post( '/lugares', authRequired, createLugar);
router.post( '/lugares/:id', authRequired, deactivateLugarAdmin);
router.delete('/lugares/:id', deactivateLugarAdmin);
router.post('/upload/image', authRequired, authorizeRole('Administrador'), upload.single('image'), uploadImage);

//GESTION RESEÑAS
router.delete('/reviews/:id', authRequired, authorizeRole('Administrador'), deleteResenaAdmin);
router.get('/reviews/stats', authRequired, authorizeRole('Administrador'), getResenasStats);

//GESTION RECOMPENSAS
router.get('/rewards', getAllRewardsAdmin);        // GET /api/admin/rewards
router.get('/rewards/stats', getRewardStatsAdmin); // GET /api/admin/rewards/stats
router.post('/rewards', createRewardAdmin);       // POST /api/admin/rewards
router.put('/rewards/:id', updateRewardAdmin);   // PUT /api/admin/rewards/:id
router.delete('/rewards/:id', deactivateRewardAdmin); // DELETE /api/admin/rewards/:id

export default router;