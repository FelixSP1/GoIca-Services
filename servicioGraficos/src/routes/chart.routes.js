import { Router } from 'express';
import { getGeneralStats, getWeeklyActivity, getCategoryDistribution } from '../controller/chart.controller.js';

const router = Router();

// Ruta para obtener todas las estadísticas clave (Stats Cards)
router.get('/stats/general', getGeneralStats);

// Ruta para obtener la actividad de registro semanal (Line Chart)
router.get('/stats/weekly-activity', getWeeklyActivity);

// Ruta para obtener la distribución de lugares por categoría (Pie Chart)
router.get('/stats/category-distribution', getCategoryDistribution);

export default router;