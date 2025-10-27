//
import { pool } from '../config/db.js';

//
export const getLugares = async (req, res) => {
    // Get optional filters from query params
    const { categoria, provincia } = req.query;

    try {
        // --- 1. Base SQL Query with JOIN and Aggregates ---
        // Select all columns from 'lugares' (aliased as 'l')
        // Calculate AVG rating and COUNT reviews from 'resenas' (aliased as 'r')
        let sql = `
            SELECT
                l.*,
                AVG(r.calificacion) AS promedioCalificacion,
                COUNT(r.idReview) AS cantidadResenas
            FROM
                lugares l
            LEFT JOIN
                resenas r ON l.idLugar = r.idLugar
            WHERE l.estado = 1 -- Start with active places
        `;

        const params = [];

        // --- 2. Add Dynamic Filters ---
        if (categoria) {
            sql += ' AND l.idCategoria = ?'; // Use alias 'l.'
            params.push(categoria);
        }
        if (provincia) {
            sql += ' AND l.idProvincia = ?'; // Use alias 'l.'
            params.push(provincia);
        }

        // --- 3. Add GROUP BY Clause ---
        // Group by all selected columns from 'lugares' to make aggregates work correctly
        sql += `
            GROUP BY
                l.idLugar, l.nombreLugar, l.descLugar, l.Direccion, l.imagenLugar,
                l.estado, l.idCategoria, l.idProvincia, l.fechaCreacion,
                l.horarioAtencion, l.restriccion
        `;

        // --- 4. Optional Ordering ---
        sql += ' ORDER BY l.nombreLugar';

        // --- 5. Execute Query ---
        const [rows] = await pool.query(sql, params);

        // --- 6. Process Results (Handle NULL average) ---
        // Convert NULL average (no reviews) to 0 or keep as null based on frontend needs
        const results = rows.map(row => ({
            ...row,
            promedioCalificacion: row.promedioCalificacion === null ? null : parseFloat(row.promedioCalificacion), // Keep null or use 0
            // cantidadResenas is already correct (0 if no reviews)
        }));


        res.json(results);

    } catch (error) {
        console.error("Error fetching places with ratings:", error);
        return res.status(500).json({ message: 'Error en el servidor al obtener lugares.', error: error.message });
    }
};

//Obtener ID del lugar
export const getLugarById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM lugares WHERE idLugar = ? and estado = 1', [id]);

        if (rows.length <= 0) {
            return res.status(404).json({ message: 'Lugar no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal', error: error.message });
    }
};

//Obtener Las Categorias
export const getCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal' });
    }
};

//Obtener las Provincias
export const getProvincias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM provincias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal' });
    }
};