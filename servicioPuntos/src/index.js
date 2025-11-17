// src/index.js
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import puntosRoutes from "./routes/puntos.routes.js";

const app = express();
const PORT = process.env.PORT || 8097;

app.use(cors());
app.use(express.json());

// Rutas
app.use("/", puntosRoutes);

// Health check
app.get("/", (req, res) => res.json({ message: "Microservicio Gamificación OK" }));

app.listen(PORT, () => {
  console.log(`Gamificación corriendo en puerto ${PORT}`);
});
