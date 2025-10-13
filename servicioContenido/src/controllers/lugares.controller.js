//
import { pool } from '../config/db.js';

//
export const getLugares = async (req, res) => {
    
    const { categoria, provincia } = req.query;

    try {
        let sql = 'SELECT * FROM Lugares WHERE 1=1';
        const params = [];

        if (categoria) {
            sql += 'AND idCategoria = ?';
            params.push(categoria);
        }
        if (provincia) {
            sql += 'AND idProvincia = ?';
            params.push(provincia);
        }

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal', error: error.message});
    }
};

//Obtener ID del lugar
export const getLugarById = async (req, res) => {
    try {
        const {id} = req.params;
        const [rows] = await pool.query('SELECT * FROM Lugares WHERE idLugar = ?', [id]);

        if (rows.length <= 0) {
            return res.status(404).json({ message: 'Lugar no encontrado'});
        }
        res.json(rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal', error: error.message});
    }
};

//Obtener Las Categorias
export const getCategorias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal'});
    }
};

//Obtener las Provincias
export const getProvincias = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM provincias');
        res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: 'Algo salio Mal'});
    }
};