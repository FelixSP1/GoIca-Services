import { Router } from 'express';
import { getUserProfile, updateProfile } from '../controllers/user.controller.js';
import { authRequired } from '../middleware/validateToken.js';

const router = Router();

// Routes related to the logged-in user's profile
router.get('/perfil', authRequired, getUserProfile);
router.put('/perfil', authRequired, updateProfile); // Your existing PUT route

export default router;