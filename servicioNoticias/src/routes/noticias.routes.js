import { Router } from 'express';
import { getNoticiasLocales } from '../controller/noticias.controller.js';

const router = Router();

router.get('/locales', getNoticiasLocales);

export default router;