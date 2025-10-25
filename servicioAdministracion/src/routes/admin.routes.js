import { Router } from "express";
import { createLugar, deleteLugar, uploadImage, deleteResenaAdmin, getResenasStats} from '../controllers/admin.controller.js';
import upload from "../config/upload.js";
import { authRequired } from '../middleware/validatedtoken.js';
import { authorizeRole } from '../middleware/validateRole.js';

const router = Router();

//Crear nuevo Lugar
router.post( '/lugares', authRequired, authorizeRole('Administrador'), createLugar);

//Desactivar Lugares
router.post( '/lugares/:id', authRequired, authorizeRole('Administrador'), deleteLugar);
router.post('/upload/image', authRequired, authorizeRole('Administrador'), upload.single('image'), uploadImage);

router.delete('/reviews/:id', authRequired, authorizeRole('Administrador'), deleteResenaAdmin);
router.get('/reviews/stats', authRequired, authorizeRole('Administrador'), getResenasStats);

export default router;