import 'dotenv/config'; 

import cors from 'cors';
import express from 'express';

//Rutas
import authRoutes from './routes/auth.route.js';
import socioRouter from './routes/socio.route.js';
import userRoutes from './routes/user.routes.js';
import adminUserRoutes from './routes/adminUser.routes.js';
import adminSocioRoutes from './routes/adminSocio.routes.js';

const app = express();
const PORT = process.env.PORT || 8082;

app.use(cors());
app.use(express.json())

app.use('/api/auth', authRoutes);
app.use('/api/socio', socioRouter);
app.use('/api/user', userRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/socios', adminSocioRoutes);

app.listen(PORT,() =>{
    console.log(`Servicio Cuentas ejecutandose en el puerto ${PORT}`);
})
