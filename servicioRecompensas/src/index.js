//
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import apiroutes from './routes/recompensas.routes.js';

const app = express();
const PORT = process.env.PORT || 8084;

app.use(express.json());

app.use(cors({
  origin: '*', // Puedes ser más específico, ej: 'http://localhost:3000'
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/", apiroutes);

app.listen(PORT, ()=>{
    console.log(` Servicio de Puntos Ejecutandose en el puerto ${PORT}`);
    
})