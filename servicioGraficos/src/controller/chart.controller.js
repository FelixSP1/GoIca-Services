import { pool } from '../config/db.js';

const getStartOfWeek = () => {
    return 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
};


export const getGeneralStats = async (req, res) => {
    try {
        const lookbackPeriod = getStartOfWeek(); 
        
        const [statsResult] = await pool.query(`
            SELECT
                (SELECT COUNT(idUsuario) FROM usuarios WHERE idRol = 1) AS totalUsuarios,
                (SELECT COUNT(idSocio) FROM socios WHERE estado = 1) AS totalSocios,
                (SELECT COUNT(idLugar) FROM lugares WHERE estado = 1) AS totalLugares,
                (SELECT COUNT(idReview) FROM resenas) AS totalResenas,
                (SELECT COUNT(idRecompensa) FROM recompensas WHERE estado = 1) AS recompensasActivas;
        `);
        const [avgCalificacionResult] = await pool.query(
            'SELECT IFNULL(ROUND(AVG(calificacion), 1), 0) AS promedioCalificacion FROM resenas'
        );
        const [newRecordsResult] = await pool.query(`
            SELECT
                (SELECT COUNT(idUsuario) FROM usuarios WHERE fechaCreacion >= ${lookbackPeriod}) AS nuevosUsuarios,
                (SELECT COUNT(idLugar) FROM lugares WHERE fechaCreacion >= ${lookbackPeriod}) AS nuevosLugares
        `);
        const [newSociosResult] = await pool.query(`
            SELECT COUNT(idSocio) AS nuevosSocios
            FROM socios
            WHERE fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);
        `);
        const isTrendingUp = newRecordsResult[0].nuevosUsuarios > 0;
        
        const stats = {
            ...statsResult[0],
            promedioCalificacion: avgCalificacionResult[0].promedioCalificacion,
            
            nuevosUsuarios: newRecordsResult[0].nuevosUsuarios,
            nuevosLugares: newRecordsResult[0].nuevosLugares,
            nuevosSocios: newSociosResult[0].nuevosSocios,
            
            tendenciaGlobal: isTrendingUp ? 'up' : 'down', 
        };

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ message: "Error interno del servidor al obtener estadísticas." });
    }
};
export const getWeeklyActivity = async (req, res) => {
    try {
        const [activityData] = await pool.query(`
            SELECT
                -- Etiquetas para la gráfica (ej: LUN, MAR, etc.)
                DAYOFWEEK(u.fechaCreacion) AS dayIndex,
                DATE_FORMAT(u.fechaCreacion, '%a') AS name, 
                
                -- Conteo de registros por día
                COUNT(DISTINCT u.idUsuario) AS usuarios,
                COUNT(DISTINCT s.idSocio) AS socios,
                COUNT(DISTINCT l.idLugar) AS lugares
            FROM 
                usuarios u
            LEFT JOIN socios s ON u.idUsuario = s.idUsuario
            LEFT JOIN lugares l ON DATE(u.fechaCreacion) = DATE(l.fechaCreacion) AND l.estado = 1
            WHERE 
                u.fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
                -- Aseguramos que solo contamos socios y lugares creados en el mismo período si es relevante
                -- s.fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND 
                -- l.fechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY 
                dayIndex, name
            ORDER BY 
                dayIndex ASC;
        `);

        res.json(activityData);
    } catch (error) {
        console.error('Error al obtener actividad semanal:', error);
        res.status(500).json({ message: "Error interno del servidor al obtener actividad semanal." });
    }
};

export const getCategoryDistribution = async (req, res) => {
    try {
        const [distribution] = await pool.query(`
            SELECT
                c.nombreCategoria AS name,
                COUNT(l.idLugar) AS value,
                CASE 
                    WHEN c.idCategoria = 2 THEN '#6366f1'   /* Restaurantes (Azul/Índigo) */
                    WHEN c.idCategoria = 3 THEN '#8b5cf6'   /* Hoteles (Púrpura) */
                    WHEN c.idCategoria = 1 THEN '#ec4899'   /* Lugares Turísticos (Rosa/Pink) */
                    WHEN c.idCategoria = 4 THEN '#10b981'   /* Viñedo/Bodega (Esmeralda) */
                    WHEN c.idCategoria = 5 THEN '#f59e0b'   /* Centro Comercial (Ámbar) */
                    ELSE '#94a3b8' 
                END AS color
            FROM lugares l
            JOIN categorias c ON l.idCategoria = c.idCategoria
            WHERE l.estado = 1 -- Solo lugares activos
            GROUP BY c.nombreCategoria, c.idCategoria
            ORDER BY value DESC;
        `);

        res.json(distribution);
    } catch (error) {
        console.error('Error al obtener distribución de categorías:', error);
        res.status(500).json({ message: "Error interno del servidor al obtener distribución de categorías." });
    }
};