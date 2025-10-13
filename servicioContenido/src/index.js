// src/index.js
import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import apiRoutes from './routes/lugares.routes.js';
import { checkDbConnection } from './config/db.js';

const app = express();
const PORT = process.env.PORT || 8081;

const startServer = async () => {
  await checkDbConnection();

  app.use(express.json());

  app.use(cors());

  //Rutas
  app.use('/', apiRoutes);

  //Middleware
  app.use((req, res, next) => {
      res.status(404).json({ message: 'Ruta no encontrada' });
  });

  app.listen(PORT, () => {
    console.log(`Servicio Contenido ejecutandose en el puerto: ${PORT}`);
  });
};

startServer();