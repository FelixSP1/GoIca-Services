//
import { pool } from '../config/db.js';

export const crearResena = async (req, res) => {
    const { idLugar, comentario, calificacion } = req.body;

    const idUsuario = req.user.id;

    try {
        const [result] = await pool.query(
            'INSERT INTO resenas (idLugar, idUsuario, comentario, calificacion) VALUES ( ?, ?, ?, ?)',
            [idLugar, idUsuario, comentario, calificacion]
        );
        res.status(201).json({ id: result.insertId, message: "Reseña creada exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error del Servidor", error: error.message });
    }
};

//RUTA PUBLICA - RESEÑAS
export const getResenasPorLugar = async (req, res) =>{
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
        'SELECT r.idReview, r.comentario, r.calificacion, r.fechaCreacion, u.nombreUsuario FROM resenas r JOIN usuarios u ON r.idUsuario = u.idUsuario WHERE r.idLugar = ? ORDER BY r.fechaCreacion DESC',
        [id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Error en el servidor.", error: error.message});
    }
}

//Todas las reseñas
export const getAllResenas = async (req, res) => {
    try {
        // Hacemos JOIN con usuarios para el nombre de usuario
        // y con lugares para el nombre del lugar
        const [rows] = await pool.query(
            `SELECT
               r.idReview,
               r.comentario,
               r.calificacion,
               r.fechaCreacion,
               u.nombreUsuario,
               l.nombreLugar
             FROM resenas r
             JOIN usuarios u ON r.idUsuario = u.idUsuario
             JOIN lugares l ON r.idLugar = l.idLugar
             ORDER BY r.fechaCreacion DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener todas las reseñas:", error);
        res.status(500).json({ message: "Error en el servidor al obtener reseñas.", error: error.message });
    }
};

//Reseña por Usuario
export const getResenasPorUsuario = async (req, res) => {
    try {
        const idUsuario = req.user.id; // Get user ID from validated token
        const [rows] = await pool.query(
            `SELECT
               r.idReview,
               r.comentario,
               r.calificacion,
               r.fechaCreacion,
               l.nombreLugar,
               l.idLugar
             FROM resenas r
             JOIN lugares l ON r.idLugar = l.idLugar
             WHERE r.idUsuario = ?
             ORDER BY r.fechaCreacion DESC`,
            [idUsuario]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener reseñas del usuario:", error);
        res.status(500).json({ message: "Error en el servidor al obtener reseñas del usuario.", error: error.message });
    }
};
