import cloudinary from "../config/cloudinary.js";
import { pool } from '../config/db.js';

//Gestion de Lugares
// --- POST /api/admin/lugares - Crear lugar ---
export const createLugar = async (req, res) =>{
    // Añadimos 'estado' opcional
    const { nombreLugar, descLugar, Direccion, imagenLugar, idCategoria, idProvincia, estado } = req.body;

    // Validación básica
    if (!nombreLugar || !idCategoria || !idProvincia) {
        return res.status(400).json({ message: "Nombre, Categoría y Provincia son requeridos."});
    }

    try {
        const [result] = await pool.query(
            // Incluimos 'estado' en el INSERT, default a 1 si no se provee
            'INSERT INTO lugares (nombreLugar, descLugar, Direccion, imagenLugar, idCategoria, idProvincia, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                nombreLugar,
                descLugar || null,
                Direccion || null,
                imagenLugar || null,
                idCategoria,
                idProvincia,
                estado !== undefined ? estado : 1 // Default a 1 (activo)
            ]
        );
        res.status(201).json({ id: result.insertId, message: "Lugar creado exitosamente." });
    } catch (error) {
        console.error("Error al crear el lugar:", error);
         // Revisar errores de Foreign Key si categoría o provincia no existen
         if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ message: `La Categoría (${idCategoria}) o Provincia (${idProvincia}) no existe.` });
         }
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- DELETE /api/admin/lugares/:id - Desactivar lugar ---
export const deactivateLugarAdmin = async (req, res) =>{ // Renombrada de deleteLugar
    const { id } = req.params;
    try {
        // Soft delete poniendo estado = 0
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
};

// --- GET /api/admin/lugares - Obtener todos los lugares ---
export const getAllLugaresAdmin = async (req, res) => {
    try {
        // Hacemos JOIN con categorias y provincias para obtener nombres
        const [lugares] = await pool.query(
            `SELECT
               l.*, -- Selecciona todas las columnas de lugares
               c.nombreCategoria,
               p.nombreProvincia
             FROM lugares l
             LEFT JOIN categorias c ON l.idCategoria = c.idCategoria
             LEFT JOIN provincias p ON l.idProvincia = p.idProvincia
             ORDER BY l.fechaCreacion DESC` // Ordena por fecha de creación
        );
        res.json(lugares);
    } catch (error) {
        console.error("Error fetching all places (admin):", error);
        res.status(500).json({ message: "Error en el servidor al obtener lugares.", error: error.message });
    }
};

// --- PUT /api/admin/lugares/:id - Actualizar lugar ---
export const updateLugarAdmin = async (req, res) => {
    const { id } = req.params; // idLugar a actualizar
    const {
        nombreLugar,
        descLugar,
        Direccion,
        imagenLugar,
        idCategoria,
        idProvincia,
        estado // Permitir actualizar estado
    } = req.body;

    // Validación
    if (!nombreLugar || !idCategoria || !idProvincia) {
        return res.status(400).json({ message: "Nombre, Categoría y Provincia son requeridos." });
    }

    try {
        const [result] = await pool.query(
            `UPDATE lugares SET
               nombreLugar = ?,
               descLugar = ?,
               Direccion = ?,
               imagenLugar = ?,
               idCategoria = ?,
               idProvincia = ?,
               estado = ?
             WHERE idLugar = ?`,
            [
                nombreLugar,
                descLugar || null,
                Direccion || null,
                imagenLugar || null,
                idCategoria,
                idProvincia,
                estado !== undefined ? estado : 1, // Default a 1 si no se envía
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Lugar no encontrado." });
        }
        res.json({ message: "Lugar actualizado exitosamente." });
    } catch (error) {
        console.error(`Error updating place ${id} (admin):`, error);
         if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ message: `La Categoría (${idCategoria}) o Provincia (${idProvincia}) no existe.` });
         }
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// --- GET /api/admin/lugares/stats (Opcional) ---
export const getLugarStatsAdmin = async (req, res) => {
    try {
        const [stats] = await pool.query(
             // Agrupa por categoría para contar
             `SELECT
                COUNT(*) as totalLugares,
                SUM(CASE WHEN l.idCategoria = 1 THEN 1 ELSE 0 END) as lugaresTuristicos,
                SUM(CASE WHEN l.idCategoria = 3 THEN 1 ELSE 0 END) as hoteles, -- Asumiendo ID 3 = Hoteles
                SUM(CASE WHEN l.idCategoria = 2 THEN 1 ELSE 0 END) as restaurantes -- Asumiendo ID 2 = Restaurantes
                -- Agrega SUM(CASE...) para otras categorías si las necesitas
              FROM lugares l`
        );
         const result = stats[0] || {};
         res.json({
             totalLugares: result.totalLugares || 0,
             lugaresTuristicos: result.lugaresTuristicos || 0,
             hoteles: result.hoteles || 0,
             restaurantes: result.restaurantes || 0
         });
    } catch (error) {
        console.error("Error fetching place stats (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

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

//--SECTION RECOMPENSAS ADMIN----

// GET /api/admin/rewards - Obtener todas las recompensas
export const getAllRewardsAdmin = async (req, res) => {
    try {
        // Unimos con socios para obtener el nombre del negocio
        const [rewards] = await pool.query(
            `SELECT
               r.*,  -- Selecciona todas las columnas de recompensas
               s.razonSocial AS nombreSocio -- Obtiene la razón social como nombreSocio
             FROM recompensas r
             LEFT JOIN socios s ON r.idSocio = s.idSocio -- LEFT JOIN por si un socio fue eliminado
             ORDER BY r.fechaInicio DESC, r.idSocio` // Ordena por fecha y socio
        );
        res.json(rewards);
    } catch (error) {
        console.error("Error fetching all rewards (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// GET /api/admin/rewards/stats - Obtener estadísticas
export const getRewardStatsAdmin = async (req, res) => {
    try {
        const [stats] = await pool.query(
            `SELECT
               COUNT(*) AS totalRecompensas,
               SUM(CASE WHEN estado = 1 THEN 1 ELSE 0 END) AS recompensasActivas,
               SUM(limite) AS stockTotal, -- Suma los límites (puede ser NULL si limite no es obligatorio)
               AVG(costePuntos) AS puntosPromedio
             FROM recompensas`
        );
         const result = stats[0] || {};
         res.json({
             totalRecompensas: result.totalRecompensas || 0,
             recompensasActivas: result.recompensasActivas || 0,
             stockTotal: result.stockTotal || 0, // Suma de stock (cuidado si 'limite' puede ser NULL)
             puntosPromedio: Math.round(result.puntosPromedio || 0) // Promedio de puntos
         });
    } catch (error) {
        console.error("Error fetching reward stats (admin):", error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// POST /api/admin/rewards - Crear nueva recompensa
export const createRewardAdmin = async (req, res) => {
    // Los datos vienen del formulario del admin
    const {
        idSocio, // Admin debe especificar a qué socio pertenece
        nombreRecompensa,
        descRecompensa,
        imagenRecompensa,
        costePuntos,
        limite,
        fechaInicio,
        fechaFin,
        estado // Opcional, podría default a 1 (activo)
    } = req.body;

    // Validación básica
    if (!idSocio || !nombreRecompensa || !costePuntos || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Faltan campos obligatorios (Socio, Nombre, Puntos, Fechas)." });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO recompensas
               (idSocio, nombreRecompensa, descRecompensa, imagenRecompensa, costePuntos, limite, fechaInicio, fechaFin, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idSocio,
                nombreRecompensa,
                descRecompensa || null,
                imagenRecompensa || null,
                costePuntos,
                limite ?? null, // Usar null si el límite es opcional/no provisto
                fechaInicio,
                fechaFin,
                estado ?? 1 // Default a activo si no se especifica
            ]
        );
        res.status(201).json({ id: result.insertId, message: "Recompensa creada exitosamente." });
    } catch (error) {
        console.error("Error creating reward (admin):", error);
         // Podría fallar si idSocio no existe (error de Foreign Key)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             return res.status(400).json({ message: `El Socio con ID ${idSocio} no existe.` });
        }
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// PUT /api/admin/rewards/:id - Actualizar recompensa
export const updateRewardAdmin = async (req, res) => {
    const { id } = req.params; // idRecompensa a actualizar
    const {
        // idSocio, // No permitir cambiar el socio propietario
        nombreRecompensa,
        descRecompensa,
        imagenRecompensa,
        costePuntos,
        limite,
        fechaInicio,
        fechaFin,
        estado
    } = req.body;

    // Validación básica
    if (!nombreRecompensa || !costePuntos || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "Faltan campos obligatorios (Nombre, Puntos, Fechas)." });
    }

    try {
        const [result] = await pool.query(
            `UPDATE recompensas SET
               nombreRecompensa = ?,
               descRecompensa = ?,
               imagenRecompensa = ?,
               costePuntos = ?,
               limite = ?,
               fechaInicio = ?,
               fechaFin = ?,
               estado = ?
             WHERE idRecompensa = ?`,
            [
                nombreRecompensa,
                descRecompensa || null,
                imagenRecompensa || null,
                costePuntos,
                limite ?? null,
                fechaInicio,
                fechaFin,
                estado ?? 1, // Default a activo si no se especifica
                id // El ID de la recompensa
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Recompensa no encontrada." });
        }
        res.json({ message: "Recompensa actualizada exitosamente." });
    } catch (error) {
        console.error(`Error updating reward ${id} (admin):`, error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};

// DELETE /api/admin/rewards/:id - Desactivar recompensa (Soft Delete)
export const deactivateRewardAdmin = async (req, res) => {
    const { id } = req.params; // idRecompensa a desactivar

    try {
        // Soft delete poniendo estado = 0
        const [result] = await pool.query(
            'UPDATE recompensas SET estado = 0 WHERE idRecompensa = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Recompensa no encontrada." });
        }
        res.json({ message: "Recompensa desactivada exitosamente." });
    } catch (error) {
        console.error(`Error deactivating reward ${id} (admin):`, error);
        res.status(500).json({ message: "Error en el servidor.", error: error.message });
    }
};
