//
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import apiroutes from './routes/recompensas.route.js';

const app = express();
const PORT = process.env.PORT || 8088;

app.use(express.json());

app.use(cors());

app.use("/api", apiroutes);

app.listen(PORT, ()=>{
    console.log(` Servicio de Puntos Ejecutandose en el puerto ${PORT}`);
    
})