import 'dotenv/config'; 

import cors from 'cors';
import express from 'express';

//Rutas
import authRoutes from './routes/auth.route.js';
import socioRouter from './routes/socio.route.js';

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json())

app.use('/api/auth', authRoutes);
app.use('/api/socio', socioRouter);

app.listen(PORT,() =>{
    console.log(`Servicio Cuentas ejecutandose en el puerto ${PORT}`);
})
