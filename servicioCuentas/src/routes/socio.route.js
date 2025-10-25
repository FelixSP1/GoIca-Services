import { Router } from 'express';
import multer from 'multer';
import {
    updateSocioPerfil,
    getSocioPerfil,
    uploadImage
} from '../controllers/socio.controller.js'; // Importa desde el nuevo controlador
import { authRequired } from '../middleware/validateToken.js'; // Necesitas la protección

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage});

// --- Rutas de Perfil de SOCIO ---
// Obtiene los datos del perfil del socio (RUC, NombreNegocio, etc.)
router.get('/perfil', authRequired, getSocioPerfil);

// Actualiza los datos del perfil del socio
router.put('/perfil', authRequired, updateSocioPerfil);

//Subir Imagen
router.post('/upload-image', authRequired, upload.single('imagen'), uploadImage);

export default router;