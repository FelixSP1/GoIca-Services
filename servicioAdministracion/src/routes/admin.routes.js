import { Router } from "express";
import express from 'express';
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
import multer from "multer";

const storage = multer.memoryStorage();

const jsonParser = express.json();

const router = Router();

//Control de Acceso - Solo ADMIN
router.use(authRequired, authorizeRole('Administrador'));

//GESTION LUGARES
router.get('/lugares', getAllLugaresAdmin);
router.post('/lugares', jsonParser, createLugar); // <--- 3. Usa jsonParser
router.put('/lugares/:id', jsonParser, updateLugarAdmin); // <--- 3. Usa jsonParser
router.delete('/lugares/:id', deactivateLugarAdmin);
router.get('/lugares/stats', getLugarStatsAdmin);


router.post('/upload-image', upload.single('imagen'), uploadImage);

//GESTION RESEÑAS
router.get('/reviews/stats', getResenasStats);
router.delete('/reviews/:id', deleteResenaAdmin);

//GESTION RECOMPENSAS
router.get('/rewards', getAllRewardsAdmin);
router.post('/rewards', jsonParser, createRewardAdmin); // <--- 3. Usa jsonParser
router.put('/rewards/:id', jsonParser, updateRewardAdmin); // <--- 3. Usa jsonParser
router.delete('/rewards/:id', deactivateRewardAdmin);
router.get('/rewards/stats', getRewardStatsAdmin);

export default router;