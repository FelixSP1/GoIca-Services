import cloudinary from "../config/cloudinary.js";
import { pool } from '../config/db.js';

//Gestion de Lugares

export const createLugar = async (req, res) =>{
    const { nombreLugar, descLugar, Direccion, imagenLugar, idCategoria, idProvincia} = req.body;

    try {
    const [result] = await pool.query(
      'INSERT INTO lugares (nombreLugar, descLugar, Direccion, imagenLugar, idCategoria, idProvincia) VALUES (?, ?, ?, ?, ?, ?)',
      [nombreLugar, descLugar, Direccion, imagenLugar, idCategoria, idProvincia]
    );
    res.status(201).json({ id: result.insertId, message: "Lugar creado exitosamente." });
  } catch (error) {
    console.error("Error al crear el lugar:", error);
    res.status(500).json({ message: "Error en el servidor.", error: error.message });
  }
};

export const deleteLugar = async (req, res) =>{
    const { id } = req.params;
    try {
        const [result] = await pool.query(
            'UPDATE lugares SET estado = 0 WHERE idLugar = ?',
            [id]
        );

        if (result.affectedRows === 0 ) {
            return res.status(404).json({message: "Lugar no encontrado"});
        }
        res.json({ message: "Lugar desactivado Correctamente"});
    } catch ( error ) {
        console.error("Error al desactivar el Lugar: ", error);
        res.status(500).json({ message: "Error en el servidor", error: error.message});      
    }
}

// Gestion de Imagenes 
export const uploadImage = async (req, res) =>{
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se ha subido ningun archivo"});
        }

        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        const result = await cloudinary.uploader.upload(base64Image, {
            folder: "goica/lugares"
        });

        res.json({ imageUrl: result.secure_url});
    } catch (error) {
        console.error("error al subir la imagen", error);
        res.status(500).json({ message: "Error al subir la imagen", error: error.message});
    }
}

//Eliminar Reseña
export const deleteResenaAdmin = async (req, res) => {
    const { id } = req.params; // idReview a eliminar

    if (!id) {
        return res.status(400).json({ message: "Se requiere el ID de la reseña." });
    }

    try {
        // Hacemos un DELETE directo ya que es un admin
        const [result] = await pool.query('DELETE FROM resenas WHERE idReview = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Reseña no encontrada." });
        }

        res.json({ message: "Reseña eliminada exitosamente por el administrador." });

    } catch (error) {
        console.error("Error al eliminar reseña (admin):", error);
        res.status(500).json({ message: "Error en el servidor al eliminar reseña.", error: error.message });
    }
};

//Obtener estadistica de Reseñas
export const getResenasStats = async (req, res) => {
    try {
        // Consulta para obtener todas las estadísticas en una sola query
        const [stats] = await pool.query(
            `SELECT
               COUNT(*) AS totalResenas,
               AVG(calificacion) AS promedioCalificacion,
               SUM(CASE WHEN calificacion = 5 THEN 1 ELSE 0 END) AS resenas5Estrellas,
               SUM(CASE WHEN MONTH(fechaCreacion) = MONTH(CURDATE()) AND YEAR(fechaCreacion) = YEAR(CURDATE()) THEN 1 ELSE 0 END) AS resenasMes
             FROM resenas`
        );

        // Formateamos el resultado para que coincida con el frontend
        const responseData = {
            totalResenas: stats[0].totalResenas || 0,
            promedioCalificacion: parseFloat(stats[0].promedioCalificacion || 0).toFixed(1),
            resenas5Estrellas: stats[0].resenas5Estrellas || 0,
            resenasMes: stats[0].resenasMes || 0
        };

        res.json(responseData);

    } catch (error) {
        console.error("Error al obtener estadísticas de reseñas:", error);
        res.status(500).json({ message: "Error en el servidor al obtener estadísticas.", error: error.message });
    }
};