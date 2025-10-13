import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import resenasRoutes from './routes/resena.route.js';

const app = express();
const PORT = process.env.PORT || 8088;

app.use(express.json());
app.use(cors());
app. use('/api', resenasRoutes);

app.listen(PORT, () =>{
    console.log(`Servicio de Interacción ejecutandose en el puerto: ${PORT}`);
    
})