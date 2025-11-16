// src/routes/puntos.routes.js
import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { getPuntos, scanQR, scanBLE, getHistorial } from "../controllers/puntos.controller.js";

const router = Router();

// GET /api/gamificacion/puntos  -> devuelve puntaje del usuario autenticado
router.get("/puntos", verifyToken, getPuntos);

// POST /api/gamificacion/qr -> body: { codigo }
router.post("/qr", verifyToken, scanQR);

// POST /api/gamificacion/ble -> body: { codigo }
router.post("/ble", verifyToken, scanBLE);

// GET /api/gamificacion/historial -> historial del usuario
router.get("/historial", verifyToken, getHistorial);

export default router;
