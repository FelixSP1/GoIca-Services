// src/routes/puntos.routes.js
import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { 
  getPuntos,         // Renombrado a getPuntosUsuario en el controlador
  getHistorial,      // Renombrado a getHistorialPuntos en el controlador
  scanQR,            // Renombrado a checkInQR en el controlador
  scanBLE,           // Renombrado a checkInBLE en el controlador
  getRecompensas,      // Importa la nueva función
  canjearRecompensa    // Importa la nueva función
} from "../controllers/puntos.controller.js";

const router = Router();

// Renombrar funciones para que coincidan con el controlador actualizado:
const {
  getPuntosUsuario: getPuntos,
  getHistorialPuntos: getHistorial,
  checkInQR: scanQR,
  checkInBLE: scanBLE
} = await import("../controllers/puntos.controller.js");

// GET /puntos -> (Llamado por RewardsScreen: /gamificacion/puntos)
router.get("/puntos", authRequired, getPuntos);

// POST /check-in-qr -> (Llamado por QRScannerScreen: /gamificacion/check-in-qr)
router.post("/check-in-qr", authRequired, scanQR);

// POST /check-in-ble -> (Llamado por RewardsScreen: /gamificacion/check-in-ble)
router.post("/check-in-ble", authRequired, scanBLE);

// GET /historial -> (Llamado por ProfileScreen: /gamificacion/historial)
router.get("/historial", authRequired, getHistorial);

// --- 👇 RUTAS NUEVAS AÑADIDAS 👇 ---

// GET /recompensas -> (Llamado por RewardsScreen: /gamificacion/recompensas)
router.get("/recompensas", authRequired, getRecompensas);

// POST /recompensas/canjear -> (Llamado por RewardsScreen: /gamificacion/recompensas/canjear)
router.post("/recompensas/canjear", authRequired, canjearRecompensa);

export default router;