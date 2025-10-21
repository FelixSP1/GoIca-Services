import { Router } from 'express';
import { register, login, updateProfile} from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/validateToken.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.put('/perfil', authRequired, updateProfile);

export default router;