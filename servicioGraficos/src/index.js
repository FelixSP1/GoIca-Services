import express from 'express';
import cors from 'cors';
import chartRoutes from './routes/chart.routes.js';
import './config/db.js';

const app = express();
const PORT = process.env.PORT;

app.use(cors()); 
app.use(express.json()); 

app.use('/api/charts', chartRoutes);

app.get('/', (req, res) => {
    res.send('Servicio de Gráficos de GoIca está activo.');
});

app.listen(PORT, () => {
    console.log(`Servicio Gráficos corriendo en puerto ${PORT}`);
    console.log(`Rutas disponibles en http://localhost:${PORT}/api/charts`);
});