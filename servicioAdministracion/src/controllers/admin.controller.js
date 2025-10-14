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