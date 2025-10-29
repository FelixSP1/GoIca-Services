//
import { createPool } from 'mysql2/promise';
import 'dotenv/config';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Configuraciones para evitar ECONNRESET con BD en la nube
    connectTimeout: 60000, // 60 segundos
    acquireTimeout: 60000, // 60 segundos
    timeout: 60000, // 60 segundos
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
};

export const pool = createPool(dbConfig);

//Comprobar la conexion

export const checkDbConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Conexion a la base de datos establecida exitosamente');
        connection.release();
    } catch (error) {
        console.error('No se pudo conectar la base de datos:', error.message);
        process.exit(1);
    }

}