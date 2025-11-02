import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import resenasRoutes from './routes/resenas.routes.js';

const app = express();
const PORT = process.env.PORT || 8083;

app.use(express.json());
app.use(cors());
app.use('/api/interaccion', resenasRoutes);

app.listen(PORT, () =>{
    console.log(`Servicio de Interacción ejecutandose en el puerto: ${PORT}`);
    
})