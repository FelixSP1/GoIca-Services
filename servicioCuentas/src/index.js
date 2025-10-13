import 'dotenv/config'; 

import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.route.js';

const app = express();
const PORT = process.env.PORT || 8086;

app.use(express.json())

app.use(cors());
app.use('/api/auth', authRoutes);

app.listen(PORT,() =>{
    console.log(`Servicio Cuentas ejecutandose en el puerto ${PORT}`);
})
