import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import adminRoutes from '../src/routes/admin.routes.js';

const app = express();
const PORT = process.env.PORT || 8085;

app.use(cors());
app.use(express.json());

app.use('/', adminRoutes);

app.listen(PORT, () =>{
    console.log(`Servicio de Admin ejecutandose en el puerto: ${PORT}`);
    
})