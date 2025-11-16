// src/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import puntosRoutes from "./routes/puntos.routes.js";

const app = express();
const PORT = process.env.PORT || 8087;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.json({ message: "Microservicio Gamificación OK" }));

// Rutas
app.use("/api/gamificacion", puntosRoutes);

app.listen(PORT, () => {
  console.log(`Gamificación corriendo en puerto ${PORT}`);
});
