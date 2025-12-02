import { Router } from 'express';
import multer from 'multer';
import { getUserProfile, updateProfile, uploadUserProfileImage, changePassword } from '../controllers/user.controller.js';
import { authRequired } from '../middleware/validateToken.js';


const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit (optional)
});

// Routes related to the logged-in user's profile
router.get('/perfil', authRequired, getUserProfile);
router.put('/perfil', authRequired, upload.single('fotoPerfil'), updateProfile); // Your existing PUT route
router.post('/upload-image', authRequired, upload.single('imagen'), uploadUserProfileImage);
//Change_Contraseña
router.put('/password', authRequired, changePassword);

export default router;