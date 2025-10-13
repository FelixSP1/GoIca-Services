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
