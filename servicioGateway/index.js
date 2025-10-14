import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import proxy from 'express-http-proxy';

const app = express();
const PORT = process.env.PORT || 8090

app.use(cors());
app.use(express.json())

//Peticiones
//direccion servicioCuentas
app.use('/api/auth',  proxy('http://localhost:8082'));

//direccion servicioContenido(Lugares)
app.use('/api/contenido',  proxy('http://localhost:8081'));

//direccion servicioInteraccion(Reseñas)
app.use('/api/interaccion',  proxy('http://localhost:8083'));

//direccion servicioRecompensas(recompensas)
app.use('/api/gamificacion', proxy('http://localhost:8084'));

//direccion servicioTraduccion (traducciones)
app.use('/api/traduccion', proxy('http://localhost:8085'));

app.listen(PORT, ()=>{
    console.log(`API Gateway ejecutandose en el puerto: ${PORT}`);
})