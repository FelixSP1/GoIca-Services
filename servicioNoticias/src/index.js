import express from 'express';
import cors from 'cors';
import noticiasRoutes from './routes/noticias.routes.js';
import 'dotenv/config'; 

const app = express();
const PORT = process.env.PORT || 8093; 

app.use(cors()); 
app.use(express.json()); 

app.use('/api/noticias', noticiasRoutes);

app.get('/', (req, res) => {
    res.send('Servicio de Noticias de GoIca activo.');
});

app.listen(PORT, () => {
    console.log(`Servicio Noticias corriendo en puerto ${PORT}`);
    console.log(`Rutas disponibles en http://localhost:${PORT}/api/noticias/locales`);
});