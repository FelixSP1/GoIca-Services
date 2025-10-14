import { Router } from "express";
import { createLugar, deleteLugar, uploadImage} from '../controllers/admin.controller.js';
import upload from "../config/upload.js";
import { authRequired } from '../middleware/validatedtoken.js';
import { authorizeRole } from '../middleware/validateRole.js';

const router = Router();

//Crear nuevo Lugar
router.post( '/lugares', authRequired, authorizeRole('Administrador'), createLugar);

//Desactivar Lugares
router.post( '/lugares/:id', authRequired, authorizeRole('Administrador'), deleteLugar);


router.post('/upload/image', authRequired, authorizeRole('Administrador'), upload.single('image'), uploadImage);

export default router;