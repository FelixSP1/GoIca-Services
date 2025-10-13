import { Router } from 'express';
import { getLugares, getLugarById, getCategorias, getProvincias} from '../controllers/lugares.controller.js';

const router = Router();

//Rutas Principales
router.get('/lugares', getLugares);
router.get('/lugares/:id', getLugarById);

//Filtros
router.get('/categorias', getCategorias)
router.get('/provincias', getProvincias)

export default router;
